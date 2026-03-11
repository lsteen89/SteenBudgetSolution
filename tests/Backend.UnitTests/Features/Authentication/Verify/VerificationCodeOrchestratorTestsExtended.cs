using System;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using Backend.Application.Abstractions.Infrastructure.EmailOutbox;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Options.Verification;
using Backend.Application.Orchestrators.Email;
using Backend.Application.Orchestrators.Email.Generators;

namespace Backend.UnitTests.Features.Authentication.Verify;

public sealed class VerificationCodeOrchestratorTestsExtended
{
    private readonly Mock<IEmailVerificationCodeRepository> _codes = new();
    private readonly Mock<IEmailOutboxRepository> _outbox = new();
    private readonly Mock<IEmailRateLimiter> _rl = new();
    private readonly Mock<ITimeProvider> _clock = new();

    private static VerificationCodeOptions Opt() => new()
    {
        TtlMinutes = 15,
        MaxAttempts = 5,
        LockMinutes = 15,
        ResendCooldownSeconds = 60,
        MaxSendsPerDay = 10,
        CodeHmacKeyBase64 = Convert.ToBase64String(new byte[32]
        {
            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
            17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32
        })
    };
    private sealed class FixedCodeGen : IVerificationCodeGenerator
    {
        public string New6Digits() => "123456";
    }


    private VerificationCodeOrchestrator SUT(DateTime now)
        => new(_codes.Object, _outbox.Object, _rl.Object, new FixedCodeGen(), _clock.Object, Options.Create(Opt()));

    [Fact]
    public async Task Given_RateLimited_When_Enqueue_Then_NoSideEffects()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();

        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(false, "cooldown:60s"));

        await SUT(now).EnqueueForResendAsync(id, "user@example.com", "sv-SE", CancellationToken.None);

        _codes.VerifyNoOtherCalls();
        _outbox.VerifyNoOtherCalls();
        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_RegisterPath_When_Allowed_Then_Uses_RegisterUpsert_And_Enqueues_And_Marks()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        string? body = null;
        _outbox.Setup(o => o.EnqueueAsync("VerificationCode", "user@example.com",
                It.IsAny<string>(), It.IsAny<string>(), now, It.IsAny<CancellationToken>()))
              .Callback<string, string, string, string, DateTime, CancellationToken>((_, _, _, html, _, _) => body = html)
              .Returns(Task.CompletedTask);

        _codes.Setup(c => c.UpsertActiveForRegisterAsync(
                id,
                It.Is<byte[]>(b => b != null && b.Length == 32), // avoid Moq pattern-matching
                now.AddMinutes(15),
                now,
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _codes.Setup(c => c.MarkSentAsync(id, now, It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        _rl.Setup(r => r.MarkSentAsync(id, EmailKind.Verification, new DateTimeOffset(now, TimeSpan.Zero), It.IsAny<CancellationToken>()))
           .Returns(Task.CompletedTask);

        await SUT(now).EnqueueForNewUserAsync(id, "user@example.com", "sv-SE", CancellationToken.None);

        _codes.Verify(c => c.UpsertActiveForRegisterAsync(id, It.IsAny<byte[]>(), now.AddMinutes(15), now, It.IsAny<CancellationToken>()), Times.Once);
        _codes.Verify(c => c.UpsertActiveForResendAsync(It.IsAny<Guid>(), It.IsAny<byte[]>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);

        body.Should().NotBeNullOrWhiteSpace();
        Regex.IsMatch(body!, @"\b\d{6}\b").Should().BeTrue();

        _rl.Verify(r => r.MarkSentAsync(id, EmailKind.Verification, new DateTimeOffset(now, TimeSpan.Zero), It.IsAny<CancellationToken>()), Times.Once);
        _codes.Verify(c => c.MarkSentAsync(id, now, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_OutboxThrows_When_Allowed_Then_DoesNotMarkSent()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        _codes.Setup(c => c.UpsertActiveForResendAsync(
                id,
                It.Is<byte[]>(b => b != null && b.Length == 32),
                now.AddMinutes(15),
                now,
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _outbox.Setup(o => o.EnqueueAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new Exception("db down"));

        Func<Task> act = () => SUT(now).EnqueueForResendAsync(id, "user@example.com", "sv-SE", CancellationToken.None);

        await act.Should().ThrowAsync<Exception>();

        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
        _codes.Verify(c => c.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_UpsertThrows_When_Allowed_Then_NoOutbox_NoMark()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        _codes.Setup(c => c.UpsertActiveForResendAsync(
                id,
                It.IsAny<byte[]>(),
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("write fail"));

        Func<Task> act = () => SUT(now).EnqueueForResendAsync(id, "user@example.com", "sv-SE", CancellationToken.None);

        await act.Should().ThrowAsync<Exception>();

        _outbox.VerifyNoOtherCalls();
        _rl.Verify(r => r.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<EmailKind>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
        _codes.Verify(c => c.MarkSentAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
    }
    [Fact]
    public async Task Given_ResendPath_When_Allowed_Then_Uses_ResendUpsert_And_Enqueues_And_Marks()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        _rl.Setup(r => r.CheckAsync(id, EmailKind.Verification, It.IsAny<CancellationToken>()))
           .ReturnsAsync(new RateLimitDecision(true));

        _codes.Setup(c => c.UpsertActiveForResendAsync(
                id,
                It.IsAny<byte[]>(),
                now.AddMinutes(15),
                now,
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _outbox.Setup(o => o.EnqueueAsync(
                "VerificationCode",
                "user@example.com",
                It.IsAny<string>(),
                It.IsAny<string>(),
                now,
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _codes.Setup(c => c.MarkSentAsync(id, now, It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);

        _rl.Setup(r => r.MarkSentAsync(id, EmailKind.Verification, new DateTimeOffset(now, TimeSpan.Zero), It.IsAny<CancellationToken>()))
           .Returns(Task.CompletedTask);

        await SUT(now).EnqueueForResendAsync(id, "user@example.com", "sv-SE", CancellationToken.None);

        _codes.Verify(c => c.UpsertActiveForResendAsync(id, It.IsAny<byte[]>(), now.AddMinutes(15), now, It.IsAny<CancellationToken>()), Times.Once);
        _codes.Verify(c => c.UpsertActiveForRegisterAsync(It.IsAny<Guid>(), It.IsAny<byte[]>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);

        _outbox.Verify(o => o.EnqueueAsync("VerificationCode", "user@example.com", It.IsAny<string>(), It.IsAny<string>(), now, It.IsAny<CancellationToken>()), Times.Once);
        _rl.Verify(r => r.MarkSentAsync(id, EmailKind.Verification, new DateTimeOffset(now, TimeSpan.Zero), It.IsAny<CancellationToken>()), Times.Once);
        _codes.Verify(c => c.MarkSentAsync(id, now, It.IsAny<CancellationToken>()), Times.Once);
    }
}
