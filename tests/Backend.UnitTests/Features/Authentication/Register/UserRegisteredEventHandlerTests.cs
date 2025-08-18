using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

using Backend.Application.Features.Register;
using Backend.Application.Features.Events.Register;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Options.Auth;
using Backend.Application.Options.URL;
using Backend.Settings.Email;

using UserModel = Backend.Domain.Entities.User.UserModel;
using MimeKit;

namespace Backend.Tests.UnitTests.Features.Authentication.Register;

public sealed class UserRegisteredEventHandlerTests
{
    private readonly Mock<IVerificationTokenRepository> _tokens = new();
    private readonly Mock<IEmailRateLimiter> _rl = new();
    private readonly Mock<IEmailService> _email = new();
    private readonly Mock<Backend.Application.Abstractions.Infrastructure.Data.IUserRepository> _users = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<ILogger<UserRegisteredEventHandler>> _log = new();

    private readonly IOptions<VerificationTokenOptions> _tokOpt
        = Options.Create(new VerificationTokenOptions { TtlHours = 24 });

    private readonly IOptions<AppUrls> _urls
        = Options.Create(new AppUrls { VerifyUrl = "https://app.ebudget.se/verify" });

    private readonly IOptions<SmtpSettings> _smtp
        = Options.Create(new SmtpSettings { FromAddress = "noreply@ebudget.se", FromName = "eBudget" });

    private readonly DateTime _now = new(2025, 1, 5, 08, 00, 00, DateTimeKind.Utc);

    private UserRegisteredEventHandler SUT()
    {
        _clock.Setup(x => x.UtcNow).Returns(_now);
        return new UserRegisteredEventHandler(_tokens.Object, _rl.Object, _email.Object, _users.Object,
            _tokOpt, _urls, _clock.Object, _smtp, _log.Object);
    }

    private static UserRegisteredEvent Ev(Guid? id = null, string email = "user@example.com")
        => new(id ?? Guid.NewGuid(), email);

    private static UserModel User(Guid id, bool confirmed)
        => new() { Id = 1, PersoId = id, Email = "user@example.com", Password = "hash", EmailConfirmed = confirmed };

    // ---------- Tests ----------

    [Fact]
    public async Task Given_UserAlreadyConfirmed_When_Handle_Then_NoToken_NoEmail_NoMark()
    {
        var id = Guid.NewGuid();
        _users.Setup(u => u.GetUserModelAsync(id, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, confirmed: true));

        await SUT().Handle(Ev(id), CancellationToken.None);

        _rl.VerifyNoOtherCalls();
        _tokens.VerifyNoOtherCalls();
        _email.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_RateLimited_When_Handle_Then_NoToken_NoEmail()
    {
        var id = Guid.NewGuid();
        _users.Setup(u => u.GetUserModelAsync(id, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, confirmed: false));

        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(Allowed: false, Reason: "cooldown"));

        await SUT().Handle(Ev(id), CancellationToken.None);

        _tokens.VerifyNoOtherCalls();
        _email.VerifyNoOtherCalls();
        _rl.Verify(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()), Times.Once);
        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_UpsertFails_When_Handle_Then_NoEmail_NoMark()
    {
        var id = Guid.NewGuid();
        _users.Setup(u => u.GetUserModelAsync(id, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, confirmed: false));

        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        // capture expiry and token
        Guid tokenCaptured = Guid.Empty;
        DateTime expiryCaptured = default;
        _tokens.Setup(t => t.UpsertSingleActiveAsync(id, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
               .Callback<Guid, Guid, DateTime, CancellationToken>((_, tok, exp, __) => { tokenCaptured = tok; expiryCaptured = exp; })
               .ReturnsAsync(0); // fail

        await SUT().Handle(Ev(id), CancellationToken.None);

        expiryCaptured.Should().Be(_now.AddHours(_tokOpt.Value.TtlHours));
        tokenCaptured.Should().NotBe(Guid.Empty);

        _email.VerifyNoOtherCalls();
        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_EmailSendFails_When_Handle_Then_NoMark()
    {
        var id = Guid.NewGuid();
        _users.Setup(u => u.GetUserModelAsync(id, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, confirmed: false));

        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        Guid tokenCaptured = Guid.Empty;
        _tokens.Setup(t => t.UpsertSingleActiveAsync(id, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
               .Callback<Guid, Guid, DateTime, CancellationToken>((_, tok, __, ___) => tokenCaptured = tok)
               .ReturnsAsync(1);

        _email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(new EmailSendResult(false, "smtp down", null));

        await SUT().Handle(Ev(id), CancellationToken.None);

        tokenCaptured.Should().NotBe(Guid.Empty);
        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_Success_When_Handle_Then_UpsertSendAndMark_WithCorrectTokenLink_And_ClockNow()
    {
        var id = Guid.NewGuid();
        var email = "user@example.com";

        _users.Setup(u => u.GetUserModelAsync(id, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, confirmed: false));

        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        Guid tokenCaptured = Guid.Empty;
        DateTime expiryCaptured = default;

        _tokens.Setup(t => t.UpsertSingleActiveAsync(id, It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
               .Callback<Guid, Guid, DateTime, CancellationToken>((_, tok, exp, __) => { tokenCaptured = tok; expiryCaptured = exp; })
               .ReturnsAsync(1);

        IEmailComposer? composerCaptured = null;
        _email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>()))
              .Callback<IEmailComposer, CancellationToken>((comp, _) => composerCaptured = comp)
              .ReturnsAsync(new EmailSendResult(true, "ok", null));

        await SUT().Handle(Ev(id, email), CancellationToken.None);

        // Upsert was done with expected expiry
        expiryCaptured.Should().Be(_now.AddHours(_tokOpt.Value.TtlHours));
        tokenCaptured.Should().NotBe(Guid.Empty);

        // Email composed with correct recipient + token in URL (N format)
        composerCaptured.Should().NotBeNull();
        var msg = composerCaptured!.Compose();
        var to = msg.To.Mailboxes.FirstOrDefault();
        to.Should().NotBeNull();
        to!.Address.Should().Be(email);

        var alt = (Multipart)msg.Body;
        var html = alt.OfType<TextPart>().First(p => p.ContentType.MimeType == "text/html").Text;
        html.Should().Contain(_urls.Value.VerifyUrl);
        html.Should().Contain(tokenCaptured.ToString("N"));

        // MarkSent called with exact NOW (DateTimeOffset)
        _rl.Verify(r => r.MarkSentAsync(id, EmailKind.Verification,
            new DateTimeOffset(_now, TimeSpan.Zero), It.IsAny<CancellationToken>()), Times.Once);
    }
}
