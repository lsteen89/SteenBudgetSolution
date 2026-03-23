using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Options.Auth;
using Backend.Application.Options.URL;
using Backend.Domain.Entities.Auth;
using Backend.Domain.Entities.User;
using Backend.Settings.Email;
using Backend.Application.Features.Authentication.Register.ResendVerificationMail;
using Backend.Application.Abstractions.Application.Orchestrators;

// Domain model
using UserModel = Backend.Domain.Entities.User.UserModel;
using MimeKit;

namespace Backend.Tests.UnitTests.Features.Authentication.Verify;

public sealed class ResendVerificationCommandHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IVerificationTokenRepository> _tokens = new();
    private readonly Mock<IEmailRateLimiter> _rl = new();
    private readonly Mock<IEmailService> _email = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<IVerificationCodeOrchestrator> _orch = new();
    private readonly Mock<ILogger<ResendVerificationCommandHandler>> _log = new();

    private readonly IOptions<VerificationTokenOptions> _tokOpt = Options.Create(new VerificationTokenOptions { TtlHours = 24 });
    private readonly IOptions<AppUrls> _urls = Options.Create(new AppUrls { VerifyUrl = "https://app.ebudget.se/verify" });
    private readonly IOptions<SmtpSettings> _smtp = Options.Create(new SmtpSettings { FromAddress = "noreply@ebudget.se", FromName = "eBudget" });

    private readonly DateTime _now = new(2025, 1, 6, 13, 0, 0, DateTimeKind.Utc);

    private ResendVerificationCommandHandler SUT()
    {
        _clock.Setup(x => x.UtcNow).Returns(_now);
        return new ResendVerificationCommandHandler(_users.Object, _tokens.Object, _orch.Object,
 _log.Object);
    }
    private static ResendVerificationCommand Cmd(string email = "User@Example.com")
        => new(email);

    private static UserModel User(Guid id, string email, bool confirmed)
        => new() { Id = 1, PersoId = id, Email = email, Password = "hash", EmailConfirmed = confirmed };

    private static UserTokenModel Tok(Guid persoid, Guid token, DateTime exp)
        => new() { PersoId = persoid, Token = token, TokenExpiryDate = exp };

    [Fact]
    public async Task Given_UserNotFound_When_Handle_Then_SilentSuccess_NoEnumeration()
    {
        _users.Setup(u => u.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync((UserModel?)null);

        var res = await SUT().Handle(Cmd(" user@example.com "), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _rl.VerifyNoOtherCalls();
        _tokens.VerifyNoOtherCalls();
        _email.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_UserAlreadyConfirmed_When_Handle_Then_SilentSuccess()
    {
        var id = Guid.NewGuid();
        _users.Setup(u => u.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, "user@example.com", confirmed: true));

        var res = await SUT().Handle(Cmd("USER@example.com"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _rl.VerifyNoOtherCalls();
        _tokens.VerifyNoOtherCalls();
        _email.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_UserExistsNotConfirmed_When_Handle_Then_EnqueueResend_And_SilentSuccess()
    {
        var id = Guid.NewGuid();

        _users.Setup(u => u.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, "user@example.com", confirmed: false));

        _users.Setup(r => r.GetUserPreferencesAsync(id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(new UserPreferencesReadModel { Locale = "sv-SE", Currency = "SEK" });

        _orch.Setup(o => o.EnqueueForResendAsync(id, "user@example.com", "sv-SE", It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        var res = await SUT().Handle(Cmd("user@example.com"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();

        _orch.Verify(o => o.EnqueueForResendAsync(id, "user@example.com", "sv-SE", It.IsAny<CancellationToken>()), Times.Once);

        // Handler should not talk to RL/email/tokens anymore:
        _rl.VerifyNoOtherCalls();
        _email.VerifyNoOtherCalls();
        _tokens.VerifyNoOtherCalls();
    }


    [Fact]
    public async Task Given_UserMissing_When_Handle_Then_SilentSuccess_And_NoEnqueue()
    {
        _users.Setup(u => u.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync((UserModel?)null);

        var res = await SUT().Handle(Cmd("user@example.com"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _orch.VerifyNoOtherCalls();
        _tokens.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_UserAlreadyConfirmed_When_Handle_Then_SilentSuccess_And_NoEnqueue()
    {
        var id = Guid.NewGuid();
        _users.Setup(u => u.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, "user@example.com", confirmed: true));

        var res = await SUT().Handle(Cmd("user@example.com"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _orch.VerifyNoOtherCalls();
        _tokens.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_UserExistsNotConfirmed_When_Handle_Then_EnqueueResend_WithNormalizedEmail_And_SilentSuccess()
    {
        var id = Guid.NewGuid();

        _users.Setup(u => u.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, "user@example.com", confirmed: false));
        _users.Setup(u => u.GetUserPreferencesAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync(new UserPreferencesReadModel { Locale = "sv-SE", Currency = "SEK" });

        _orch.Setup(o => o.EnqueueForResendAsync(id, "user@example.com", "sv-SE", It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        var res = await SUT().Handle(Cmd("USER@EXAMPLE.COM  "), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();

        _orch.Verify(o => o.EnqueueForResendAsync(id, "user@example.com", "sv-SE", It.IsAny<CancellationToken>()), Times.Once);
        _tokens.VerifyNoOtherCalls(); // handler should not touch tokens
    }
}
