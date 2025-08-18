using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

using Backend.Application.Features.Commands.Auth.ResendVerification;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Options.Auth;
using Backend.Application.Options.URL;
using Backend.Domain.Entities.Auth;
using Backend.Domain.Users;
using Backend.Settings.Email;

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
    private readonly Mock<ILogger<ResendVerificationCommandHandler>> _log = new();

    private readonly IOptions<VerificationTokenOptions> _tokOpt = Options.Create(new VerificationTokenOptions { TtlHours = 24 });
    private readonly IOptions<AppUrls> _urls = Options.Create(new AppUrls { VerifyUrl = "https://app.ebudget.se/verify" });
    private readonly IOptions<SmtpSettings> _smtp = Options.Create(new SmtpSettings { FromAddress = "noreply@ebudget.se", FromName = "eBudget" });

    private readonly DateTime _now = new(2025, 1, 6, 13, 0, 0, DateTimeKind.Utc);

    private ResendVerificationCommandHandler SUT()
    {
        _clock.Setup(x => x.UtcNow).Returns(_now);
        return new ResendVerificationCommandHandler(_users.Object, _tokens.Object, _rl.Object, _email.Object,
            _clock.Object, _tokOpt, _urls, _smtp, _log.Object);
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
    public async Task Given_RateLimited_When_Handle_Then_SilentSuccess_NoSend()
    {
        var id = Guid.NewGuid();
        _users.Setup(u => u.GetUserModelAsync(null, "user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, "user@example.com", confirmed: false));

        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(false, "cooldown"));

        var res = await SUT().Handle(Cmd("user@example.com"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _email.VerifyNoOtherCalls();
        _tokens.VerifyNoOtherCalls();
        _rl.Verify(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()), Times.Once);
        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_ExistingToken_WithEnoughTimeLeft_When_Handle_Then_ReusesToken_SendsEmail_And_Marks()
    {
        var id = Guid.NewGuid();
        var email = "user@example.com";
        var normalized = "user@example.com";
        var token = Guid.NewGuid();

        _users.Setup(u => u.GetUserModelAsync(null, normalized, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, normalized, confirmed: false));

        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        _tokens.Setup(t => t.GetByUserAsync(id, It.IsAny<CancellationToken>()))
               .ReturnsAsync(Tok(id, token, _now.AddMinutes(10))); // > 5m

        IEmailComposer? captured = null;
        _email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>()))
              .Callback<IEmailComposer, CancellationToken>((comp, _) => captured = comp)
              .ReturnsAsync(new EmailSendResult(true, "ok", null));

        var res = await SUT().Handle(Cmd(email), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _tokens.Verify(t => t.UpsertSingleActiveAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);

        // Email contains token N-format and normalized recipient
        var msg = captured!.Compose();
        msg.To.Mailboxes.First().Address.Should().Be(normalized);
        var html = ((Multipart)msg.Body).OfType<TextPart>().First(p => p.ContentType.MimeType == "text/html").Text;
        html.Should().Contain(token.ToString("N"));

        _rl.Verify(r => r.MarkSentAsync(id, EmailKind.Verification, new DateTimeOffset(_now, TimeSpan.Zero), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_NoExistingToken_Or_ImminentExpiry_When_Handle_Then_MintsNewToken_Upserts_Sends_And_Marks()
    {
        var id = Guid.NewGuid();
        var normalized = "user@example.com";

        _users.Setup(u => u.GetUserModelAsync(null, normalized, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, normalized, confirmed: false));

        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        // Case: either no token OR token expiring <= 5m
        _tokens.Setup(t => t.GetByUserAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync((UserTokenModel?)null);

        Guid tokenCaptured = Guid.Empty;
        DateTime expCaptured = default;
        _tokens.Setup(t => t.UpsertSingleActiveAsync(id, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
               .Callback<Guid, Guid, DateTime, CancellationToken>((_, tok, exp, __) => { tokenCaptured = tok; expCaptured = exp; })
               .ReturnsAsync(1);

        _email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(new EmailSendResult(true, "ok", null));

        var res = await SUT().Handle(Cmd("USER@EXAMPLE.COM"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        tokenCaptured.Should().NotBe(Guid.Empty);
        expCaptured.Should().Be(_now.AddHours(24));
        _rl.Verify(r => r.MarkSentAsync(id, EmailKind.Verification, new DateTimeOffset(_now, TimeSpan.Zero), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_UpsertFails_When_Handle_Then_VerificationUpdateFailed_And_NoEmail()
    {
        var id = Guid.NewGuid();
        var normalized = "user@example.com";

        _users.Setup(u => u.GetUserModelAsync(null, normalized, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, normalized, confirmed: false));
        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));
        _tokens.Setup(t => t.GetByUserAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync((UserTokenModel?)null);

        _tokens.Setup(t => t.UpsertSingleActiveAsync(id, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(0);

        var res = await SUT().Handle(Cmd(normalized), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.VerificationUpdateFailed);
        _email.VerifyNoOtherCalls();
        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_SendFails_When_Handle_Then_EmailSendFailed_And_NoMark()
    {
        var id = Guid.NewGuid();
        var normalized = "user@example.com";

        _users.Setup(u => u.GetUserModelAsync(null, normalized, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, normalized, confirmed: false));
        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));
        _tokens.Setup(t => t.GetByUserAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync((UserTokenModel?)null);
        _tokens.Setup(t => t.UpsertSingleActiveAsync(id, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);

        _email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(new EmailSendResult(false, "smtp down", null));

        var res = await SUT().Handle(Cmd("user@example.com"), CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.EmailSendFailed);
        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_ExistingToken_ImminentExpiry_When_Handle_Then_MintsNewToken()
    {
        var id = Guid.NewGuid();
        var normalized = "user@example.com";

        _users.Setup(u => u.GetUserModelAsync(null, normalized, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, normalized, confirmed: false));
        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>())).ReturnsAsync(new RateLimitDecision(true));

        // existing token but expiring in 4 minutes -> mint
        var existing = Tok(id, Guid.NewGuid(), _now.AddMinutes(4));
        _tokens.Setup(t => t.GetByUserAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        _tokens.Setup(t => t.UpsertSingleActiveAsync(id, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(1);
        _email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(new EmailSendResult(true, "ok", null));

        var res = await SUT().Handle(Cmd(normalized), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _tokens.Verify(t => t.UpsertSingleActiveAsync(id, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
