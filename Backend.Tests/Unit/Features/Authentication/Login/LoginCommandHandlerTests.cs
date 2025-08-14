using System;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using AutoFixture;
using AutoFixture.AutoMoq;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using MySqlConnector;

// SUT + contracts
using Backend.Application.Features.Authentication.Login;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Settings;
using Backend.Domain.Users;


using UserModel = Backend.Domain.Entities.User.UserModel;
using AccessTokenResult = Backend.Application.Common.Security.AccessTokenResult;
using RefreshJwtTokenEntity = Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity;
using TokenStatus = Backend.Infrastructure.Entities.Tokens.TokenStatus;

namespace Backend.Tests.Unit.Features.Authentication.Login;

public sealed class LoginCommandHandlerTests
{
    private readonly Fixture _fx = new();
    private readonly Mock<IRecaptchaService> _recaptcha = new();
    private readonly Mock<IUserAuthenticationRepository> _authz = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IRefreshTokenRepository> _refreshRepo = new();
    private readonly Mock<IJwtService> _jwt = new();
    private readonly Mock<IConfiguration> _configuration = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<ILogger<LoginCommandHandler>> _log = new();
    private readonly Mock<IUnitOfWork> _uow = new();

    private readonly IOptions<AuthLockoutOptions> _lockout =
        Options.Create(new AuthLockoutOptions { WindowMinutes = 15, MaxAttempts = 3, LockoutMinutes = 10 });

    private readonly IOptions<JwtSettings> _jwtSettings =
        Options.Create(new JwtSettings { RefreshTokenExpiryDays = 7, RefreshTokenExpiryDaysAbsolute = 30, ExpiryMinutes = 15, SecretKey = "k" });

    private readonly IOptions<WebSocketSettings> _ws =
        Options.Create(new WebSocketSettings { Secret = "ws-secret" });

    private readonly DateTime _now = new(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    public LoginCommandHandlerTests()
    {
        _fx.Customize(new AutoMoqCustomization { ConfigureMembers = true });
        _clock.Setup(x => x.UtcNow).Returns(_now);
    }

    private LoginCommandHandler SUT() => new(
        _uow.Object,
        _recaptcha.Object,
        _authz.Object,
        _lockout,
        _users.Object,
        _refreshRepo.Object,
        _jwt.Object,
        _clock.Object,
        _jwtSettings,
        _configuration.Object,
        _log.Object,
        _ws
    );

    private static LoginCommand Cmd(
        string email = "user@example.com",
        string pwd = "correct-password",
        string captcha = "ok",
        bool remember = false,
        string ip = "1.2.3.4",
        string device = "dev-1",
        string ua = "UA")
        => new(email, pwd, captcha, remember, ip, device, ua);

    private static UserModel User(
        Guid? id = null,
        string email = "user@example.com",
        bool confirmed = true,
        string? bcrypt = null,
        DateTime? lockout = null)
        => new()
        {
            Id = 1,
            PersoId = id ?? Guid.NewGuid(),
            Email = email,
            Password = bcrypt ?? BCrypt.Net.BCrypt.HashPassword("correct-password"),
            EmailConfirmed = confirmed,
            LockoutUntil = lockout
        };

    private AccessTokenResult AT(
        Guid? sessionId = null,
        string? jti = null,
        string? token = null,
        Guid? persoid = null,
        DateTime? expires = null)
        => new(
            token ?? "at.jwt",
            jti ?? Guid.NewGuid().ToString(),
            sessionId ?? Guid.NewGuid(),
            persoid ?? Guid.NewGuid(),
            expires ?? _now.AddMinutes(_jwtSettings.Value.ExpiryMinutes > 0 ? _jwtSettings.Value.ExpiryMinutes : 15)
        );

    // ========== Tests ==========

    [Fact]
    public async Task Given_InvalidCaptcha_When_Handle_Then_InvalidCaptcha()
    {
        _recaptcha.Setup(x => x.ValidateTokenAsync("bad")).ReturnsAsync(false);
        var res = await SUT().Handle(Cmd(captcha: "bad"), CancellationToken.None);
        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCaptcha);
    }

    [Fact]
    public async Task Given_LockoutUntilFuture_When_Handle_Then_UserLockedOut()
    {
        var user = User(lockout: _now.AddMinutes(5));
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var res = await SUT().Handle(Cmd(), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.UserLockedOut);
        _authz.Verify(x => x.UnlockUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_WrongPassword_When_Handle_Then_RecordsAttempt_And_InvalidCredentials()
    {
        var user = User(bcrypt: BCrypt.Net.BCrypt.HashPassword("wrong"));
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _authz.Setup(x => x.CountFailedAttemptsSinceAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(1);

        var res = await SUT().Handle(Cmd(), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);
        _authz.Verify(x => x.InsertLoginAttemptAsync(user, "1.2.3.4", "UA", _now, It.IsAny<CancellationToken>()), Times.Once);
        _authz.Verify(x => x.LockUserByEmailAsync(It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_WrongPassword_And_MaxAttemptsReached_When_Handle_Then_LocksUser()
    {
        var user = User(bcrypt: BCrypt.Net.BCrypt.HashPassword("wrong"));
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        _authz.Setup(x => x.CountFailedAttemptsSinceAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(_lockout.Value.MaxAttempts);

        var res = await SUT().Handle(Cmd(), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);
        _authz.Verify(x => x.LockUserByEmailAsync("user@example.com", _now.AddMinutes(_lockout.Value.LockoutMinutes), It.IsAny<CancellationToken>()), Times.Once);
    }

    // RED test by design (you asked for this) – make handler return EmailNotConfirmed to pass later.
    [Fact]
    public async Task Given_EmailNotConfirmed_When_Handle_Then_EmailNotConfirmed_INTENTIONAL_FAIL()
    {
        var user = User(confirmed: false);
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var res = await SUT().Handle(Cmd(), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.EmailNotConfirmed);
    }

    [Fact]
    public async Task Given_ValidCredentials_When_Handle_Then_Revokes_Inserts_Resets_ReturnsTokens()
    {
        var user = User();
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT();
        _jwt.Setup(x => x.CreateAccessToken(user.PersoId, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", null)).Returns(at);
        _jwt.Setup(x => x.CreateRefreshToken()).Returns("PLAIN_RT");

        _refreshRepo.Setup(x => x.RevokeSessionAsync(user.PersoId, at.SessionId, _now, It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _refreshRepo.Setup(x => x.InsertAsync(It.IsAny<RefreshJwtTokenEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var res = await SUT().Handle(Cmd(), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        res.Value.PersoId.Should().Be(user.PersoId);
        res.Value.SessionId.Should().Be(at.SessionId);
        res.Value.AccessToken.Should().Be(at.Token);
        res.Value.RefreshToken.Should().NotBeNullOrEmpty();

        _authz.Verify(x => x.DeleteAttemptsByEmailAsync("user@example.com", It.IsAny<CancellationToken>()), Times.Once);
        _refreshRepo.Verify(x => x.RevokeSessionAsync(user.PersoId, at.SessionId, _now, It.IsAny<CancellationToken>()), Times.Once);
        _refreshRepo.Verify(x => x.InsertAsync(It.Is<RefreshJwtTokenEntity>(r =>
            r.Persoid == user.PersoId &&
            r.SessionId == at.SessionId &&
            r.AccessTokenJti == at.TokenJti &&
            r.ExpiresRollingUtc <= r.ExpiresAbsoluteUtc &&
            r.RevokedUtc == null &&
            r.Status.Equals(TokenStatus.Active)
        ), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_InsertCollision1062Once_When_Handle_Then_RetriesAndSucceeds()
    {
        var user = User();
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT();
        _jwt.Setup(x => x.CreateAccessToken(user.PersoId, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", null)).Returns(at);
        _jwt.SetupSequence(x => x.CreateRefreshToken()).Returns("FIRST").Returns("SECOND");

        _refreshRepo.SetupSequence(x => x.InsertAsync(It.IsAny<RefreshJwtTokenEntity>(), It.IsAny<CancellationToken>()))
            .Throws(CreateMySqlDuplicateKey("UK_Hashed"))
            .ReturnsAsync(1);

        var res = await SUT().Handle(Cmd(), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _refreshRepo.Verify(x => x.InsertAsync(It.IsAny<RefreshJwtTokenEntity>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task Given_AllowTestEmailsEnabled_And_WhitelistedEmail_When_Handle_Then_SkipsCaptcha()
    {
        // 1. ARRANGE: Set up the mock to return the values your handler needs for this test case.
        _configuration.Setup(c => c["ALLOW_TEST_EMAILS"]).Returns("true");
        _configuration.Setup(c => c["TestEmailAddress"]).Returns("l@l.se");

        // The rest of your setup...
        _recaptcha.Setup(x => x.ValidateTokenAsync(It.IsAny<string>())).ReturnsAsync(false); // Would fail if evaluated

        var testEmail = "l@l.se";
        // Ensure the user object is created with the correct test email
        var user = User(email: testEmail, id: Guid.NewGuid());

        _users.Setup(x => x.GetUserModelAsync(null, testEmail, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var at = AT();
        // Ensure this mock uses the correct user.Email from the object created above
        _jwt.Setup(x => x.CreateAccessToken(user.PersoId, user.Email, It.IsAny<IReadOnlyList<string>>(), "dev-1", "UA", null)).Returns(at);
        _jwt.Setup(x => x.CreateRefreshToken()).Returns("RT");
        _refreshRepo.Setup(x => x.RevokeSessionAsync(user.PersoId, at.SessionId, _now, It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _refreshRepo.Setup(x => x.InsertAsync(It.IsAny<RefreshJwtTokenEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);

        // 2. ACT
        var res = await SUT().Handle(Cmd(email: testEmail), CancellationToken.None);

        // 3. ASSERT
        res.IsSuccess.Should().BeTrue();
        _recaptcha.Verify(x => x.ValidateTokenAsync(It.IsAny<string>()), Times.Never); // Optional but good: verify it was never called
    }

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
