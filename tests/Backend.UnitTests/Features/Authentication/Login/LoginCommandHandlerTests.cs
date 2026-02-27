using Backend.Application.Features.Authentication.Shared.Models;
using AutoFixture;
using AutoFixture.AutoMoq;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using Moq;
using Backend.Application.Features.Shared.Issuers.Auth;
using Backend.Application.DTO.Auth;

// SUT + contracts
using Backend.Application.Features.Authentication.Login;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Settings;
using Backend.Domain.Errors.User;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Domain.Shared;

using UserModel = Backend.Domain.Entities.User.UserModel;
using AccessTokenResult = Backend.Application.Common.Security.AccessTokenResult;
using Backend.Application.Abstractions.Application.Services.Security;
using Org.BouncyCastle.Asn1.Cmp;

namespace Backend.UnitTests.Unit.Features.Authentication.Login;

public sealed class LoginCommandHandlerTests
{
    private readonly Fixture _fx = new();
    private readonly Mock<IRecaptchaService> _recaptcha = new();
    private readonly Mock<IHumanChallengePolicy> _challenge = new(MockBehavior.Strict);
    private readonly Mock<IUserAuthenticationRepository> _authz = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IRefreshTokenRepository> _refreshRepo = new();
    private readonly Mock<IJwtService> _jwt = new();
    private readonly Mock<IConfiguration> _configuration = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<ILogger<LoginCommandHandler>> _log = new();
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ITurnstileService> _turnstile = new();
    private readonly Mock<IAuthSessionIssuer> _issuer = new();

    private readonly IOptions<AuthLockoutOptions> _lockout =
        Options.Create(new AuthLockoutOptions { WindowMinutes = 15, MaxAttempts = 3, LockoutMinutes = 10 });

    private readonly IOptions<JwtSettings> _jwtSettings = Options.Create(new JwtSettings
    {
        Issuer = "e",
        Audience = "e",
        ExpiryMinutes = 15,
        RefreshTokenExpiryDays = 7,
        RefreshTokenExpiryDaysAbsolute = 30,

        // new fields (key-rotation)
        ActiveKid = "unit",
        Keys = new Dictionary<string, string>
        {
            // 32-byte base64; fine for tests
            ["unit"] = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
        }
    });
    private readonly IOptions<WebSocketSettings> _ws =
        Options.Create(new WebSocketSettings { Secret = "ws-secret" });

    private readonly DateTime _now = new(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    public LoginCommandHandlerTests()
    {
        _fx.Customize(new AutoMoqCustomization { ConfigureMembers = true });
        _clock.Setup(x => x.UtcNow).Returns(_now);
        _challenge
  .Setup(x => x.ShouldRequireAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
  .ReturnsAsync(false);
    }

    private LoginCommandHandler SUT() => new(
        authz: _authz.Object,
        lockoutOpts: _lockout,
        users: _users.Object,
        humanChallengePolicy: _challenge.Object,
        turnstile: _turnstile.Object,
        issuer: _issuer.Object,
        clock: _clock.Object,
        log: _log.Object
    );

    private static LoginCommand Cmd(
        string email = "user@example.com",
        string pwd = "correct-password",
        string? humanToken = null,
        bool remember = false,
        string? ip = "1.2.3.4",
        string device = "dev-1",
        string ua = "UA")
        => new(email, pwd, humanToken, remember, ip, device, ua);

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
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
             .ReturnsAsync(user);

        _authz.Setup(x => x.CountFailedAttemptsSinceAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(1);

        var res = await SUT().Handle(Cmd(ip: "1.2.3.4"), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);

        _authz.Verify(x => x.InsertLoginAttemptAsync(user, "1.2.3.4", "UA", _now, It.IsAny<CancellationToken>()), Times.Once);
        _issuer.VerifyNoOtherCalls();
    }
    [Fact]
    public async Task Given_HumanTokenProvided_And_Invalid_When_Handle_Then_InvalidChallengeToken()
    {
        _turnstile.Setup(x => x.ValidateAsync("bad", It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(false);

        var res = await SUT().Handle(Cmd(humanToken: "bad"), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidChallengeToken);

        _users.VerifyNoOtherCalls();
        _issuer.VerifyNoOtherCalls();
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
    public async Task Given_ValidCredentials_When_Handle_Then_IssuesSession_ResetsAttempts_ReturnsIssuedSession()
    {
        var user = User(); // confirmed true
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
             .ReturnsAsync(user);

        var expected = new IssuedAuthSession(
            new AuthResult("at.jwt", user.PersoId, Guid.NewGuid(), "ws", RememberMe: false),
            "rt"
        );

        _issuer.Setup(x => x.IssueAsync(user, false, "dev-1", "UA", It.IsAny<CancellationToken>()))
               .ReturnsAsync(expected);

        _authz.Setup(x => x.DeleteAttemptsByEmailAsync("user@example.com", It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);

        var res = await SUT().Handle(Cmd(), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        res.Value.Should().NotBeNull();
        res.Value!.RefreshToken.Should().Be("rt");
        res.Value.Result.AccessToken.Should().Be("at.jwt");
        res.Value.Result.PersoId.Should().Be(user.PersoId);

        _issuer.Verify(x => x.IssueAsync(user, false, "dev-1", "UA", It.IsAny<CancellationToken>()), Times.Once);
        _authz.Verify(x => x.DeleteAttemptsByEmailAsync("user@example.com", It.IsAny<CancellationToken>()), Times.Once);
    }
    [Fact]
    public async Task Given_ChallengeRequired_And_NoToken_When_Handle_Then_HumanVerificationRequired()
    {
        var user = User(); // confirmed
        _users.Setup(x => x.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(user);

        _challenge.Setup(x => x.ShouldRequireAsync("user@example.com", "1.2.3.4", "UA", It.IsAny<CancellationToken>()))
                  .ReturnsAsync(true);

        var res = await SUT().Handle(Cmd(humanToken: null, ip: "1.2.3.4", ua: "UA"), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.HumanVerificationRequired);

        _turnstile.VerifyNoOtherCalls();
        _issuer.VerifyNoOtherCalls();
        _authz.VerifyNoOtherCalls();
    }

}
