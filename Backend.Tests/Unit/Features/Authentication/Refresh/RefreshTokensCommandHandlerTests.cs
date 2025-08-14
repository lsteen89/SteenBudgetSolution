using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using MySqlConnector;

using Backend.Application.Features.Commands.Auth.RefreshToken;
using Backend.Domain.Users;
using Backend.Settings;
using Backend.Infrastructure.Security; // TokenGenerator
using Backend.Infrastructure.Entities.Tokens;

// Abstractions used by handler
using IUnitOfWork = Backend.Application.Abstractions.Infrastructure.Data.IUnitOfWork;
using IRefreshTokenRepository = Backend.Application.Abstractions.Infrastructure.Data.IRefreshTokenRepository;
using IJwtService = Backend.Application.Abstractions.Infrastructure.Security.IJwtService;
using ITimeProvider = Backend.Application.Abstractions.Infrastructure.System.ITimeProvider;

// Domain
using UserModel = Backend.Domain.Entities.User.UserModel;
// User repository interface
using IUserRepository = Backend.Application.Abstractions.Infrastructure.Data.IUserRepository;

// AccessToken result returned by IJwtService
using AccessTokenResult = Backend.Application.Common.Security.AccessTokenResult;

namespace Backend.Tests.Unit.Features.Authentication.RefreshToken;

public sealed class RefreshTokensCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IRefreshTokenRepository> _refresh = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IJwtService> _jwt = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<ILogger<RefreshTokensCommandHandler>> _log = new();

    private readonly IOptions<JwtSettings> _jwtCfg = Options.Create(new JwtSettings
    {
        RefreshTokenExpiryDays = 7,
        RefreshTokenExpiryDaysAbsolute = 30,
        ExpiryMinutes = 15,
        Issuer = "e",
        Audience = "e",
        SecretKey = "k"
    });
    private readonly IOptions<WebSocketSettings> _ws = Options.Create(new WebSocketSettings { Secret = "ws-secret" });

    private readonly DateTime _now = new(2025, 1, 2, 9, 0, 0, DateTimeKind.Utc);

    private RefreshTokensCommandHandler SUT()
    {
        _clock.Setup(x => x.UtcNow).Returns(_now);
        return new RefreshTokensCommandHandler(_uow.Object, _refresh.Object, _users.Object, _jwt.Object, _clock.Object, _jwtCfg, _ws, _log.Object);
    }

    private static RefreshTokensCommand Cmd(
        string cookie,
        Guid sessionId,
        string ua = "UA",
        string device = "dev-1",
        string? oldAT = null)
        => new(oldAT, cookie, sessionId, ua, device);

    private static UserModel User(Guid? id = null, string email = "user@example.com")
        => new() { Id = 1, PersoId = id ?? Guid.NewGuid(), Email = email, Password = "hash", EmailConfirmed = true };

    private static RefreshJwtTokenEntity Current(Guid persoid, Guid sessionId, string hash, DateTime abs, DateTime rolling, bool persistent = false)
        => new()
        {
            TokenId = Guid.NewGuid(),
            Persoid = persoid,
            SessionId = sessionId,
            HashedToken = hash,
            AccessTokenJti = Guid.NewGuid().ToString(),
            ExpiresAbsoluteUtc = abs,
            ExpiresRollingUtc = rolling,
            Status = TokenStatus.Active,
            IsPersistent = persistent,
            DeviceId = "dev-1",
            UserAgent = "UA",
            CreatedUtc = DateTime.UtcNow
        };

    private static AccessTokenResult AT(Guid persoid, Guid sessionId, string? jti = null, string? token = null, DateTime? exp = null)
        => new(
            token ?? "new.at.jwt",
            jti ?? Guid.NewGuid().ToString(),
            sessionId,
            persoid,
            exp ?? DateTime.UtcNow.AddMinutes(15)
        );

    // ============ Tests ============

    [Theory]
    [InlineData(null)]           // null cookie
    [InlineData("")]             // empty cookie
    [InlineData("   ")]          // whitespace cookie
    public async Task Given_MissingCookie_When_Handle_Then_InvalidRefreshToken(string? cookie)
    {
        var res = await SUT().Handle(Cmd(cookie!, Guid.NewGuid()), CancellationToken.None);
        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidRefreshToken);
    }

    [Fact]
    public async Task Given_EmptySession_When_Handle_Then_InvalidRefreshToken()
    {
        var res = await SUT().Handle(Cmd("cookie", Guid.Empty), CancellationToken.None);
        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidRefreshToken);
    }

    [Fact]
    public async Task Given_NoMatchingRowOrExpired_When_Handle_Then_InvalidRefreshToken()
    {
        var cookie = "old-cookie";
        var sessionId = Guid.NewGuid();
        var hash = TokenGenerator.HashToken(cookie);

        _refresh.Setup(r => r.GetActiveByCookieForUpdateAsync(sessionId, hash, _now, It.IsAny<CancellationToken>()))
                .ReturnsAsync((RefreshJwtTokenEntity?)null);

        var res = await SUT().Handle(Cmd(cookie, sessionId), CancellationToken.None);
        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidRefreshToken);
    }

    [Theory]
    [InlineData(null)]           // user not found
    [InlineData("   ")]          // email empty/whitespace
    public async Task Given_UserMissingOrEmailEmpty_When_Handle_Then_RefreshUserNotFound(string? email)
    {
        var cookie = "ok";
        var sessionId = Guid.NewGuid();
        var hash = TokenGenerator.HashToken(cookie);
        var persoid = Guid.NewGuid();

        var current = Current(persoid, sessionId, hash, _now.AddDays(10), _now.AddDays(1));
        _refresh.Setup(r => r.GetActiveByCookieForUpdateAsync(sessionId, hash, _now, It.IsAny<CancellationToken>()))
                .ReturnsAsync(current);

        if (email is null)
            _users.Setup(u => u.GetUserModelAsync(It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync((UserModel?)null);
        else
            _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>()))
                  .ReturnsAsync(User(persoid, email));

        var res = await SUT().Handle(Cmd(cookie, sessionId), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.RefreshUserNotFound);
    }

    [Fact]
    public async Task Given_Success_When_Handle_Then_RotatesInPlace_ClampsRolling_And_ReturnsNewTokens()
    {
        var cookie = "rt-cookie";
        var sessionId = Guid.NewGuid();
        var persoid = Guid.NewGuid();
        var hash = TokenGenerator.HashToken(cookie);

        // absolute > now+rolling -> expect newRolling = now + 7d
        var current = Current(persoid, sessionId, hash, _now.AddDays(10), _now.AddDays(1), persistent: true);
        _refresh.Setup(r => r.GetActiveByCookieForUpdateAsync(sessionId, hash, _now, It.IsAny<CancellationToken>()))
                .ReturnsAsync(current);

        var user = User(persoid);
        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT(persoid, sessionId);
        _jwt.Setup(j => j.CreateAccessToken(persoid, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", sessionId)).Returns(at);

        _jwt.SetupSequence(j => j.CreateRefreshToken())
            .Returns("NEWRT");

        // Capture Rotate params to verify clamp and oldHash guard
        Guid tokenIdSeen = Guid.Empty;
        string oldHashSeen = "";
        string newHashSeen = "";
        string newJtiSeen = "";
        DateTime newRollingSeen = default;

        _refresh.Setup(r => r.RotateInPlaceAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .Callback<Guid, string, string, string, DateTime, CancellationToken>((tokenId, oldHash, newHash, jti, roll, _) =>
                {
                    tokenIdSeen = tokenId;
                    oldHashSeen = oldHash;
                    newHashSeen = newHash;
                    newJtiSeen = jti;
                    newRollingSeen = roll;
                })
                .ReturnsAsync(1);

        var res = await SUT().Handle(Cmd(cookie, sessionId, oldAT: null), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        res.Value.PersoId.Should().Be(persoid);
        res.Value.SessionId.Should().Be(sessionId);
        res.Value.AccessToken.Should().Be(at.Token);
        res.Value.RefreshToken.Should().NotBeNullOrEmpty();
        res.Value.RememberMe.Should().BeTrue(); // persistent propagated

        tokenIdSeen.Should().Be(current.TokenId);
        oldHashSeen.Should().Be(current.HashedToken);
        newJtiSeen.Should().Be(at.TokenJti);

        var expectedNewRolling = _now.AddDays(_jwtCfg.Value.RefreshTokenExpiryDays);
        newRollingSeen.Should().Be(expectedNewRolling);
        newRollingSeen.Should().BeOnOrBefore(current.ExpiresAbsoluteUtc);
        newHashSeen.Should().Be(TokenGenerator.HashToken("NEWRT"));
    }

    [Fact]
    public async Task Given_AbsoluteSoonerThanRolling_When_Handle_Then_RollingIsClampedToAbsolute()
    {
        var cookie = "rt-cookie";
        var sessionId = Guid.NewGuid();
        var persoid = Guid.NewGuid();
        var hash = TokenGenerator.HashToken(cookie);

        // absolute (in 3d) < now+rolling (7d) -> clamp to 3d
        var current = Current(persoid, sessionId, hash, _now.AddDays(3), _now.AddDays(1), persistent: false);
        _refresh.Setup(r => r.GetActiveByCookieForUpdateAsync(sessionId, hash, _now, It.IsAny<CancellationToken>()))
                .ReturnsAsync(current);

        var user = User(persoid);
        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT(persoid, sessionId);
        _jwt.Setup(j => j.CreateAccessToken(persoid, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", sessionId)).Returns(at);
        _jwt.Setup(j => j.CreateRefreshToken()).Returns("NEXT");

        DateTime newRollingSeen = default;
        _refresh.Setup(r => r.RotateInPlaceAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .Callback<Guid, string, string, string, DateTime, CancellationToken>((_, _, _, _, roll, __) => newRollingSeen = roll)
                .ReturnsAsync(1);

        var res = await SUT().Handle(Cmd(cookie, sessionId), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        newRollingSeen.Should().Be(current.ExpiresAbsoluteUtc); // clamped
    }

    [Fact]
    public async Task Given_HashCollisionOnce_When_Handle_Then_RetriesAndSucceeds()
    {
        var cookie = "rt-cookie";
        var sessionId = Guid.NewGuid();
        var persoid = Guid.NewGuid();
        var hash = TokenGenerator.HashToken(cookie);

        var current = Current(persoid, sessionId, hash, _now.AddDays(30), _now.AddDays(10));
        _refresh.Setup(r => r.GetActiveByCookieForUpdateAsync(sessionId, hash, _now, It.IsAny<CancellationToken>()))
                .ReturnsAsync(current);

        var user = User(persoid);
        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT(persoid, sessionId);
        _jwt.Setup(j => j.CreateAccessToken(persoid, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", sessionId)).Returns(at);

        _jwt.SetupSequence(j => j.CreateRefreshToken()).Returns("FIRST").Returns("SECOND");

        _refresh.SetupSequence(r => r.RotateInPlaceAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .Throws(CreateMySqlDuplicateKey("UK_Hashed"))
                .ReturnsAsync(1);

        var res = await SUT().Handle(Cmd(cookie, sessionId), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _refresh.Verify(r => r.RotateInPlaceAsync(It.IsAny<Guid>(), It.IsAny<string>(), TokenGenerator.HashToken("FIRST"), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
        _refresh.Verify(r => r.RotateInPlaceAsync(It.IsAny<Guid>(), It.IsAny<string>(), TokenGenerator.HashToken("SECOND"), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_OldAccessTokenPresent_When_Handle_Then_BlacklistsOldAT()
    {
        var cookie = "rt-cookie";
        var sessionId = Guid.NewGuid();
        var persoid = Guid.NewGuid();
        var hash = TokenGenerator.HashToken(cookie);

        var current = Current(persoid, sessionId, hash, _now.AddDays(20), _now.AddDays(5));
        _refresh.Setup(r => r.GetActiveByCookieForUpdateAsync(sessionId, hash, _now, It.IsAny<CancellationToken>()))
                .ReturnsAsync(current);

        var user = User(persoid);
        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT(persoid, sessionId);
        _jwt.Setup(j => j.CreateAccessToken(persoid, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", sessionId)).Returns(at);
        _jwt.Setup(j => j.CreateRefreshToken()).Returns("NEXT");
        _refresh.Setup(r => r.RotateInPlaceAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(1);

        var res = await SUT().Handle(Cmd(cookie, sessionId, oldAT: "old.at.jwt"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _jwt.Verify(j => j.BlacklistJwtTokenAsync("old.at.jwt", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_BlacklistThrows_When_Handle_Then_StillSucceeds()
    {
        var cookie = "rt-cookie";
        var sessionId = Guid.NewGuid();
        var persoid = Guid.NewGuid();
        var hash = TokenGenerator.HashToken(cookie);

        var current = Current(persoid, sessionId, hash, _now.AddDays(20), _now.AddDays(5));
        _refresh.Setup(r => r.GetActiveByCookieForUpdateAsync(sessionId, hash, _now, It.IsAny<CancellationToken>()))
                .ReturnsAsync(current);

        var user = User(persoid);
        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT(persoid, sessionId);
        _jwt.Setup(j => j.CreateAccessToken(persoid, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", sessionId)).Returns(at);
        _jwt.Setup(j => j.CreateRefreshToken()).Returns("NEXT");
        _refresh.Setup(r => r.RotateInPlaceAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(1);

        _jwt.Setup(j => j.BlacklistJwtTokenAsync("bad-old-at", It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("boom"));

        var res = await SUT().Handle(Cmd(cookie, sessionId, oldAT: "bad-old-at"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue(); // best-effort: blacklist failure is tolerated
    }

    [Fact]
    public async Task Given_RotateReturnsZero_When_Handle_Then_Throws_ToPreserveAtomicity()
    {
        var cookie = "rt-cookie";
        var sessionId = Guid.NewGuid();
        var persoid = Guid.NewGuid();
        var hash = TokenGenerator.HashToken(cookie);

        var current = Current(persoid, sessionId, hash, _now.AddDays(20), _now.AddDays(5));
        _refresh.Setup(r => r.GetActiveByCookieForUpdateAsync(sessionId, hash, _now, It.IsAny<CancellationToken>()))
                .ReturnsAsync(current);

        var user = User(persoid);
        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT(persoid, sessionId);
        _jwt.Setup(j => j.CreateAccessToken(persoid, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", sessionId)).Returns(at);
        _jwt.Setup(j => j.CreateRefreshToken()).Returns("NEXT");

        _refresh.Setup(r => r.RotateInPlaceAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(0); // guard failed -> someone else rotated or hash mismatch

        Func<Task> act = async () => await SUT().Handle(Cmd(cookie, sessionId), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
                 .WithMessage("Refresh rotation failed.");
    }

    // ---- helper ----
    // Helper: create a MySqlException 1062 with "UK_Hashed"
    private static MySqlException CreateMySqlDuplicateKey(string indexName)
    {
        var exType = typeof(MySqlException);

        // Find the specific INTERNAL constructor that takes (MySqlErrorCode, string)
        var ctor = exType.GetConstructor(
            BindingFlags.NonPublic | BindingFlags.Instance,
            binder: null,
            new[] { typeof(MySqlErrorCode), typeof(string) },
            modifiers: null);

        if (ctor is null)
        {
            // This failsafe should not be hit now, but it's good practice
            throw new InvalidOperationException("The internal MySqlException(MySqlErrorCode, string) constructor was not found. The MySqlConnector package may have changed its internal API again.");
        }

        var message = $"Duplicate entry for key '{indexName}'";

        // Invoke the found constructor with the correct parameter types
        return (MySqlException)ctor.Invoke(new object[] { MySqlErrorCode.DuplicateKeyEntry, message });
    }
}
