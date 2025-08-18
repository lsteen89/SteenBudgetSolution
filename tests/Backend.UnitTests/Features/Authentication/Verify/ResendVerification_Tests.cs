using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using Backend.Application.Features.Commands.Auth.ResendVerification;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Options.Auth;
using Backend.Application.Options.URL;
using Backend.Domain.Users;
using Backend.Domain.Shared;
using Backend.Settings.Email;
using Microsoft.Extensions.Logging;
using Backend.Domain.Entities.Auth;

namespace Backend.UnitTests.Features.Authentication.Verify;
public class ResendVerification_Tests
{
    [Fact]
    public async Task Given_TokenHasMoreThan5Min_When_Resend_Then_ReuseToken()
    {
        var now = DateTime.UtcNow;
        var user = new Backend.Domain.Entities.User.UserModel { Id = 1, PersoId = Guid.NewGuid(), Email = "u@e.se", Password = "x", EmailConfirmed = false };
        var users = new Mock<IUserRepository>(); users.Setup(r => r.GetUserModelAsync(null, "u@e.se", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var tokens = new Mock<IVerificationTokenRepository>();
        tokens.Setup(t => t.GetByUserAsync(user.PersoId, It.IsAny<CancellationToken>()))
              .ReturnsAsync(new UserTokenModel { PersoId = user.PersoId, Token = Guid.NewGuid(), TokenExpiryDate = now.AddMinutes(10) });

        var rl = new Mock<IEmailRateLimiter>();
        rl.Setup(x => x.CheckAsync(user.PersoId, EmailKind.Verification, It.IsAny<CancellationToken>())).ReturnsAsync(new RateLimitDecision(true));
        rl.Setup(x => x.MarkSentAsync(user.PersoId, EmailKind.Verification, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var email = new Mock<IEmailService>(); email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>())).ReturnsAsync(new EmailSendResult(true, null, null));
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(c => c.UtcNow).Returns(now);

        var sut = new ResendVerificationCommandHandler(users.Object, tokens.Object, rl.Object, email.Object, clock.Object,
            Options.Create(new VerificationTokenOptions { TtlHours = 24 }),
            Options.Create(new AppUrls { VerifyUrl = "https://x" }),
            Options.Create(new SmtpSettings { FromAddress = "noreply@x", FromName = "X" }),
            Mock.Of<ILogger<ResendVerificationCommandHandler>>());

        var res = await sut.Handle(new ResendVerificationCommand("u@e.se"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        tokens.Verify(t => t.UpsertSingleActiveAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
        email.Verify(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_TokenExpiringSoon_When_Resend_Then_MintNew()
    {
        var now = DateTime.UtcNow;
        var user = new Backend.Domain.Entities.User.UserModel { Id = 1, PersoId = Guid.NewGuid(), Email = "u@e.se", Password = "x", EmailConfirmed = false };
        var users = new Mock<IUserRepository>(); users.Setup(r => r.GetUserModelAsync(null, "u@e.se", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var tokens = new Mock<IVerificationTokenRepository>();
        tokens.Setup(t => t.GetByUserAsync(user.PersoId, It.IsAny<CancellationToken>()))
              .ReturnsAsync(new UserTokenModel { PersoId = user.PersoId, Token = Guid.NewGuid(), TokenExpiryDate = now.AddMinutes(2) });
        tokens.Setup(t => t.UpsertSingleActiveAsync(user.PersoId, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var rl = new Mock<IEmailRateLimiter>(); rl.Setup(x => x.CheckAsync(user.PersoId, EmailKind.Verification, It.IsAny<CancellationToken>())).ReturnsAsync(new RateLimitDecision(true));
        var email = new Mock<IEmailService>(); email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>())).ReturnsAsync(new EmailSendResult(true, null, null));
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(c => c.UtcNow).Returns(now);

        var sut = new ResendVerificationCommandHandler(users.Object, tokens.Object, rl.Object, email.Object, clock.Object,
            Options.Create(new VerificationTokenOptions { TtlHours = 24 }),
            Options.Create(new AppUrls { VerifyUrl = "https://x" }),
            Options.Create(new SmtpSettings { FromAddress = "noreply@x", FromName = "X" }),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<ResendVerificationCommandHandler>>());

        var res = await sut.Handle(new ResendVerificationCommand("u@e.se"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        tokens.Verify(t => t.UpsertSingleActiveAsync(user.PersoId, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_RateLimited_When_Resend_Then_SilentSuccess_NoEmail()
    {
        var now = DateTime.UtcNow;
        var user = new Backend.Domain.Entities.User.UserModel { Id = 1, PersoId = Guid.NewGuid(), Email = "u@e.se", Password = "x", EmailConfirmed = false };
        var users = new Mock<IUserRepository>(); users.Setup(r => r.GetUserModelAsync(null, "u@e.se", It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var tokens = new Mock<IVerificationTokenRepository>();
        var rl = new Mock<IEmailRateLimiter>(); rl.Setup(x => x.CheckAsync(user.PersoId, EmailKind.Verification, It.IsAny<CancellationToken>())).ReturnsAsync(new RateLimitDecision(false, "cooldown:60s"));
        var email = new Mock<IEmailService>();
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(c => c.UtcNow).Returns(now);

        var sut = new ResendVerificationCommandHandler(users.Object, tokens.Object, rl.Object, email.Object, clock.Object,
            Options.Create(new VerificationTokenOptions { TtlHours = 24 }),
            Options.Create(new AppUrls { VerifyUrl = "https://x" }),
            Options.Create(new SmtpSettings { FromAddress = "noreply@x", FromName = "X" }),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<ResendVerificationCommandHandler>>());

        var res = await sut.Handle(new ResendVerificationCommand("u@e.se"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        email.VerifyNoOtherCalls();
        tokens.VerifyNoOtherCalls();
    }
}
