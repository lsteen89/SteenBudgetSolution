using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;
using Backend.Application.Features.Commands.Auth.VerifyEmail;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Domain.Shared;
using Microsoft.Extensions.Logging;
using Backend.Domain.Entities.Auth;
using Backend.Domain.Users;

namespace Backend.UnitTests.Features.Authentication.Verify;
public class VerifyEmail_Edge_Tests
{
    [Fact]
    public async Task Given_ExpiredToken_When_Verify_Then_TokenNotFound()
    {
        var tokens = new Mock<IVerificationTokenRepository>();
        tokens.Setup(t => t.GetByTokenAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(new UserTokenModel { PersoId = Guid.NewGuid(), Token = Guid.NewGuid(), TokenExpiryDate = DateTime.UtcNow.AddMinutes(-1) });

        var users = new Mock<IUserRepository>();
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(c => c.UtcNow).Returns(DateTime.UtcNow);

        var sut = new VerifyEmailCommandHandler(tokens.Object, users.Object, clock.Object, Mock.Of<ILogger<VerifyEmailCommandHandler>>());
        var res = await sut.Handle(new VerifyEmailCommand(Guid.NewGuid()), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.VerificationTokenNotFound);
    }

    [Fact]
    public async Task Given_AlreadyConfirmed_When_Verify_Then_EmailAlreadyVerified()
    {
        var pid = Guid.NewGuid();
        var tokens = new Mock<IVerificationTokenRepository>();
        tokens.Setup(t => t.GetByTokenAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(new UserTokenModel { PersoId = pid, Token = Guid.NewGuid(), TokenExpiryDate = DateTime.UtcNow.AddHours(1) });

        var users = new Mock<IUserRepository>();
        users.Setup(u => u.GetUserModelAsync(pid, null, It.IsAny<CancellationToken>()))
             .ReturnsAsync(new Backend.Domain.Entities.User.UserModel { PersoId = pid, Email = "x@x", Password = "p", EmailConfirmed = true });

        var clock = new Mock<ITimeProvider>(); clock.SetupGet(c => c.UtcNow).Returns(DateTime.UtcNow);

        var sut = new VerifyEmailCommandHandler(tokens.Object, users.Object, clock.Object, Mock.Of<ILogger<VerifyEmailCommandHandler>>());
        var res = await sut.Handle(new VerifyEmailCommand(Guid.NewGuid()), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.EmailAlreadyVerified);
    }
}
