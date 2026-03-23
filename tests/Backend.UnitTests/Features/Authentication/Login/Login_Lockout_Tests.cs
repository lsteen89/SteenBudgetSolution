using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

using Backend.Application.Features.Authentication.Login;
using Backend.Application.Abstractions.Application.Orchestrators; // if needed
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Features.Shared.Issuers.Auth;
using Backend.Domain.Entities.User;
using Backend.Domain.Errors.User;
using Backend.Settings;
using Backend.Application.Abstractions.Application.Services.Security;

namespace Backend.UnitTests.Features.Authentication.Login;

public sealed class Login_Lockout_Tests
{
    private static UserModel CreateUser(Guid persoId, string passwordHash, DateTime? lockout = null)
        => new()
        {
            Id = 1,
            PersoId = persoId,
            Email = "user@example.com",
            Password = passwordHash,
            EmailConfirmed = true,
            LockoutUntil = lockout,
            FirstName = "T",
            LastName = "U",
            Roles = "1"
        };

    private static (LoginCommandHandler SUT,
                        Mock<IUserAuthenticationRepository> Authz,
                        Mock<IPasswordService> PasswordSvc, // Return the mock
                        Mock<IAuthSessionIssuer> Issuer,
                        Mock<ITurnstileService> Turnstile)
            MakeSut(UserModel user, DateTime now, int windowMin = 15, int maxAttempts = 3)
    {
        var authz = new Mock<IUserAuthenticationRepository>(MockBehavior.Strict);
        var users = new Mock<IUserRepository>();
        var pwdSvc = new Mock<IPasswordService>(); // Create the mock
        var challenge = new Mock<IHumanChallengePolicy>();
        var issuer = new Mock<IAuthSessionIssuer>(MockBehavior.Strict);
        var turnstile = new Mock<ITurnstileService>(MockBehavior.Strict);
        var clock = new Mock<ITimeProvider>();
        var log = new Mock<ILogger<LoginCommandHandler>>();

        clock.SetupGet(c => c.UtcNow).Returns(now);
        users.Setup(r => r.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
             .ReturnsAsync(user);

        var sut = new LoginCommandHandler(
            authz: authz.Object,
            passwordService: pwdSvc.Object, // Inject Mock
            lockoutOpts: Options.Create(new AuthLockoutOptions { WindowMinutes = windowMin, MaxAttempts = maxAttempts, LockoutMinutes = 15 }),
            users: users.Object,
            humanChallengePolicy: challenge.Object,
            turnstile: turnstile.Object,
            issuer: issuer.Object,
            clock: clock.Object,
            log: log.Object
        );

        return (sut, authz, pwdSvc, issuer, turnstile);
    }

    [Fact]
    public async Task Given_UserLocked_When_Login_Then_UserLockedOut()
    {
        var now = DateTime.UtcNow;
        // Notice: We just pass "any_hash". We don't call a real hasher.
        var (sut, authz, _, issuer, turnstile) = MakeSut(CreateUser(Guid.NewGuid(), "any_hash", lockout: now.AddMinutes(5)), now);

        var cmd = new LoginCommand("user@example.com", "any_password", null, false, "ip", "dev", "ua");
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.UserLockedOut);

        authz.VerifyNoOtherCalls();
        issuer.VerifyNoOtherCalls();
        turnstile.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_LockoutExpired_When_Login_Then_UnlockCalled()
    {
        var now = DateTime.UtcNow;
        var u = CreateUser(Guid.NewGuid(), "hashed_val", lockout: now.AddMinutes(-1));
        var (sut, authz, pwdSvc, issuer, turnstile) = MakeSut(u, now);

        // Tell the mock the password was WRONG
        pwdSvc.Setup(s => s.Verify("wrong_password", "hashed_val")).Returns(false);

        authz.Setup(a => a.UnlockUserAsync(u.PersoId, It.IsAny<CancellationToken>())).ReturnsAsync(1);
        authz.Setup(a => a.InsertLoginAttemptAsync(u, It.IsAny<string?>(), "ua", now, It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        authz.Setup(a => a.CountFailedAttemptsSinceAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(1);

        var cmd = new LoginCommand("user@example.com", "wrong_password", null, false, "ip", "dev", "ua");
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);

        authz.Verify(a => a.UnlockUserAsync(u.PersoId, It.IsAny<CancellationToken>()), Times.Once);
    }
    [Fact]
    public async Task Given_WrongPasswordAndThresholdReached_When_Login_Then_LockUser()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var user = CreateUser(Guid.NewGuid(), "hashed_val");

        // Pass the mock password service (pwdSvc) from our MakeSut factory
        var (sut, authz, pwdSvc, issuer, turnstile) = MakeSut(user, now, maxAttempts: 3);

        // 1. Force the password verification to FAIL
        pwdSvc.Setup(s => s.Verify("wrong", "hashed_val")).Returns(false);

        // 2. Setup the expectations for a failed login that hits the threshold
        authz.Setup(a => a.InsertLoginAttemptAsync(user, It.IsAny<string?>(), "ua", now, It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        authz.Setup(a => a.CountFailedAttemptsSinceAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(3); // Threshold reached

        authz.Setup(a => a.LockUserByEmailAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        // Act
        var cmd = new LoginCommand("user@example.com", "wrong", null, false, "ip", "dev", "ua");
        var res = await sut.Handle(cmd, CancellationToken.None);

        // Assert
        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);

        // Verify the locking logic was triggered
        authz.Verify(a => a.LockUserByEmailAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);

        issuer.VerifyNoOtherCalls();
        turnstile.VerifyNoOtherCalls();
    }
}