using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using Backend.Application.Features.Authentication.Login;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Entities.User;
using Backend.Domain.Users;
using Microsoft.Extensions.Logging;
using Backend.Settings;


namespace Backend.UnitTests.Features.Authentication.Login;
public class Login_Lockout_Tests
{
    private static UserModel User(bool confirmed = true, string? bcrypt = null, DateTime? lockout = null)
        => new()
        {
            Id = 1,
            PersoId = Guid.NewGuid(),
            Email = "user@example.com",
            Password = bcrypt ?? BCrypt.Net.BCrypt.HashPassword("correct"),
            EmailConfirmed = confirmed,
            LockoutUntil = lockout
        };

    private static (LoginCommandHandler SUT, Mock<IUserAuthenticationRepository> Authz, Mock<IUserRepository> Users) MakeSut(
        UserModel user, DateTime now, int windowMin = 15, int maxAttempts = 3)
    {
        var authz = new Mock<IUserAuthenticationRepository>(MockBehavior.Strict);
        var users = new Mock<IUserRepository>();
        var recaptcha = new Mock<IRecaptchaService>(); recaptcha.Setup(x => x.ValidateTokenAsync(It.IsAny<string>())).ReturnsAsync(true);
        var jwt = new Mock<IJwtService>();
        var refresh = new Mock<IRefreshTokenRepository>();
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(c => c.UtcNow).Returns(now);
        var log = new Mock<ILogger<LoginCommandHandler>>();

        users.Setup(r => r.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
             .ReturnsAsync(user);

        var sut = new LoginCommandHandler(
            uow: Mock.Of<IUnitOfWork>(),
            recaptcha: recaptcha.Object,
            authz: authz.Object,
            lockoutOpts: Options.Create(new AuthLockoutOptions { WindowMinutes = windowMin, MaxAttempts = maxAttempts, LockoutMinutes = 15 }),
            users: users.Object,
            refreshRepo: refresh.Object,
            jwt: jwt.Object,
            clock: clock.Object,
            jwtSettings: Options.Create(new JwtSettings { RefreshTokenExpiryDays = 7, RefreshTokenExpiryDaysAbsolute = 30 }),
            configuration: Mock.Of<IConfiguration>(),
            log: log.Object,
            wsOpts: Options.Create(new Backend.Settings.WebSocketSettings { Secret = "ws" })
        );
        return (sut, authz, users);
    }

    [Fact]
    public async Task Given_UserLocked_When_Login_Then_UserLockedOut()
    {
        var now = DateTime.UtcNow;
        var (sut, authz, _) = MakeSut(User(lockout: now.AddMinutes(5)), now);

        var cmd = new LoginCommand("user@example.com", "correct", "ok", false, "ip", "dev", "ua");
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.UserLockedOut);
        authz.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_LockoutExpired_When_Login_Then_UnlockCalled()
    {
        var now = DateTime.UtcNow;
        var u = User(lockout: now.AddMinutes(-1));
        var (sut, authz, _) = MakeSut(u, now);

        authz.Setup(a => a.UnlockUserAsync(u.PersoId, It.IsAny<CancellationToken>())).ReturnsAsync(1);
        authz.Setup(a => a.InsertLoginAttemptAsync(u, "ip", "ua", now, It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        authz.Setup(a => a.CountFailedAttemptsSinceAsync("user@example.com", now.AddMinutes(-15), It.IsAny<CancellationToken>()))
             .ReturnsAsync(1);

        var cmd = new LoginCommand("user@example.com", "wrong", "ok", false, "ip", "dev", "ua");
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);
        authz.Verify(a => a.UnlockUserAsync(u.PersoId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_WrongPasswordAndThresholdReached_When_Login_Then_LockUser()
    {
        var now = DateTime.UtcNow;
        var u = User();
        var (sut, authz, _) = MakeSut(u, now, maxAttempts: 3);

        authz.Setup(a => a.InsertLoginAttemptAsync(u, "ip", "ua", now, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        authz.Setup(a => a.CountFailedAttemptsSinceAsync("user@example.com", now.AddMinutes(-15), It.IsAny<CancellationToken>()))
             .ReturnsAsync(3);
        authz.Setup(a => a.LockUserByEmailAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        var cmd = new LoginCommand("user@example.com", "wrong", "ok", false, "ip", "dev", "ua");
        var res = await sut.Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidCredentials);
        authz.Verify(a => a.LockUserByEmailAsync("user@example.com", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
