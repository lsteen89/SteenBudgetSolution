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
    private static UserModel User(bool confirmed = true, string? bcrypt = null, DateTime? lockout = null)
        => new()
        {
            Id = 1,
            PersoId = Guid.NewGuid(),
            Email = "user@example.com",
            Password = bcrypt ?? BCrypt.Net.BCrypt.HashPassword("correct"),
            EmailConfirmed = confirmed,
            LockoutUntil = lockout,
            FirstName = "T",
            LastName = "U",
            Roles = "1"
        };

    private static (LoginCommandHandler SUT,
                    Mock<IUserAuthenticationRepository> Authz,
                    Mock<IUserRepository> Users,
                    Mock<IAuthSessionIssuer> Issuer,
                    Mock<ITurnstileService> Turnstile)
        MakeSut(UserModel user, DateTime now, int windowMin = 15, int maxAttempts = 3)
    {
        var authz = new Mock<IUserAuthenticationRepository>(MockBehavior.Strict);
        var users = new Mock<IUserRepository>();
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
            lockoutOpts: Options.Create(new AuthLockoutOptions { WindowMinutes = windowMin, MaxAttempts = maxAttempts, LockoutMinutes = 15 }),
            users: users.Object,
            humanChallengePolicy: challenge.Object,
            turnstile: turnstile.Object,
            issuer: issuer.Object,
            clock: clock.Object,
            log: log.Object
        );

        return (sut, authz, users, issuer, turnstile);
    }

    [Fact]
    public async Task Given_UserLocked_When_Login_Then_UserLockedOut()
    {
        var now = DateTime.UtcNow;
        var (sut, authz, _, issuer, turnstile) = MakeSut(User(lockout: now.AddMinutes(5)), now);

        var cmd = new LoginCommand("user@example.com", "correct", HumanToken: null, RememberMe: false, RemoteIp: "ip", DeviceId: "dev", UserAgent: "ua");
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
        var u = User(lockout: now.AddMinutes(-1));
        var (sut, authz, _, issuer, turnstile) = MakeSut(u, now);

        authz.Setup(a => a.UnlockUserAsync(u.PersoId, It.IsAny<CancellationToken>())).ReturnsAsync(1);
        authz.Setup(a => a.InsertLoginAttemptAsync(u, It.IsAny<string?>(), "ua", now, It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        authz.Setup(a => a.CountFailedAttemptsSinceAsync("user@example.com", now.AddMinutes(-15), It.IsAny<CancellationToken>()))
             .ReturnsAsync(1);

        var cmd = new LoginCommand("user@example.com", "wrong", HumanToken: null, RememberMe: false, RemoteIp: "ip", DeviceId: "dev", UserAgent: "ua");
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);

        authz.Verify(a => a.UnlockUserAsync(u.PersoId, It.IsAny<CancellationToken>()), Times.Once);
        issuer.VerifyNoOtherCalls();
        turnstile.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_WrongPasswordAndThresholdReached_When_Login_Then_LockUser()
    {
        var now = DateTime.UtcNow;
        var u = User();
        var (sut, authz, _, issuer, turnstile) = MakeSut(u, now, maxAttempts: 3);

        authz.Setup(a => a.InsertLoginAttemptAsync(u, It.IsAny<string?>(), "ua", now, It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        authz.Setup(a => a.CountFailedAttemptsSinceAsync("user@example.com", now.AddMinutes(-15), It.IsAny<CancellationToken>()))
             .ReturnsAsync(3);
        authz.Setup(a => a.LockUserByEmailAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        var cmd = new LoginCommand("user@example.com", "wrong", HumanToken: null, RememberMe: false, RemoteIp: "ip", DeviceId: "dev", UserAgent: "ua");
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);

        authz.Verify(a => a.LockUserByEmailAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
        issuer.VerifyNoOtherCalls();
        turnstile.VerifyNoOtherCalls();
    }
}