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
using Microsoft.Extensions.Logging;
using Backend.Application.Common.Security;
using Backend.Settings;

namespace Backend.UnitTests.Features.Authentication.Login;
public class Login_SessionHygiene_Tests
{
    [Fact]
    public async Task Given_ValidLogin_When_Handle_Then_RevokeSessionBeforeInsert()
    {
        var now = DateTime.UtcNow;
        var user = new UserModel { Id = 1, PersoId = Guid.NewGuid(), Email = "user@example.com", Password = BCrypt.Net.BCrypt.HashPassword("pw"), EmailConfirmed = true };

        var users = new Mock<IUserRepository>();
        users.Setup(r => r.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var recaptcha = new Mock<IRecaptchaService>(); recaptcha.Setup(x => x.ValidateTokenAsync(It.IsAny<string>())).ReturnsAsync(true);
        var authz = new Mock<IUserAuthenticationRepository>(MockBehavior.Strict);
        var refresh = new Mock<IRefreshTokenRepository>(MockBehavior.Strict);
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(c => c.UtcNow).Returns(now);
        var jwt = new Mock<IJwtService>();
        var at = new AccessTokenResult("at", Guid.NewGuid().ToString(), Guid.NewGuid(), user.PersoId, now.AddMinutes(15));
        jwt.Setup(j => j.CreateAccessToken(
            user.PersoId,
            user.Email,
            It.IsAny<IReadOnlyList<string>>(),
            It.IsAny<string>(), // deviceId
            It.IsAny<string>(), // userAgent
            It.IsAny<Guid?>()   // sessionId
        )).Returns(at);
        jwt.Setup(j => j.CreateRefreshToken()).Returns("rt");

        authz.Setup(a => a.DeleteAttemptsByEmailAsync(
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()
        )).Returns(Task.CompletedTask);

        var seq = new MockSequence();
        refresh.InSequence(seq).Setup(r => r.RevokeSessionAsync(user.PersoId, at.SessionId, now, It.IsAny<CancellationToken>())).ReturnsAsync(1);
        refresh.InSequence(seq).Setup(r => r.InsertAsync(It.IsAny<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var sut = new LoginCommandHandler(
            uow: Mock.Of<IUnitOfWork>(),
            recaptcha: recaptcha.Object,
            authz: authz.Object,
            lockoutOpts: Options.Create(new AuthLockoutOptions()),
            users: users.Object,
            refreshRepo: refresh.Object,
            jwt: jwt.Object,
            clock: clock.Object,
            jwtSettings: Options.Create(new JwtSettings { RefreshTokenExpiryDays = 7, RefreshTokenExpiryDaysAbsolute = 30 }),
            configuration: Mock.Of<IConfiguration>(),
            log: Mock.Of<ILogger<LoginCommandHandler>>(),
            wsOpts: Options.Create(new Backend.Settings.WebSocketSettings { Secret = "ws" })
        );

        var res = await sut.Handle(new LoginCommand("user@example.com", "pw", "ok", false, "ip", "dev", "UA"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        refresh.VerifyAll();
    }
}
