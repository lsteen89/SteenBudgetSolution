using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

using Backend.Infrastructure.Email; // EmailRateLimiter
using Backend.Application.Abstractions.Infrastructure.Email; // IEmailRateLimitRepository
using Backend.Application.Abstractions.Infrastructure.RateLimiting; // IEmailRateLimiter, EmailKind
using Backend.Application.Options.Email; // EmailRateLimitOptions
using Backend.Application.Abstractions.Infrastructure.System; // ITimeProvider
using Backend.Infrastructure.Entities.Email; // EmailRateLimitRow

namespace Backend.Tests.UnitTests.Features.RateLimiting;

public sealed class EmailRateLimiterTests
{
    private readonly Mock<IEmailRateLimitRepository> _repo = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<ILogger<EmailRateLimiter>> _log = new();

    private readonly IOptions<EmailRateLimitOptions> _opt =
        Options.Create(new EmailRateLimitOptions { DailyLimit = 3, CooldownPeriodMinutes = 10, RetentionDays = 60 });

    private readonly DateTime _now = new(2025, 1, 7, 10, 0, 0, DateTimeKind.Utc);

    private EmailRateLimiter SUT()
    {
        _clock.Setup(x => x.UtcNow).Returns(_now);
        return new EmailRateLimiter(_repo.Object, _opt, _clock.Object, _log.Object);
    }

    private static byte[] Hash(string s) => SHA256.HashData(Encoding.UTF8.GetBytes(s));

    // ------------- CHECK (Guid) -------------

    [Fact]
    public async Task Given_NoPriorRow_When_Check_GuidKey_Then_Allowed()
    {
        var userId = Guid.NewGuid();
        var keyHash = Hash($"user:{userId:N}");
        var dayUtc = _now.Date;

        _repo.Setup(r => r.GetTodayAsync(It.Is<byte[]>(b => b.SequenceEqual(keyHash)),
                                        (byte)EmailKind.Verification,
                                        It.Is<DateTime>(d => d == dayUtc),
                                        It.IsAny<CancellationToken>()))
                    .ReturnsAsync((EmailRateLimitRow?)null);

        var limiter = SUT();
        var decision = await limiter.CheckAsync(userId, EmailKind.Verification, CancellationToken.None);

        decision.Allowed.Should().BeTrue();
        decision.Reason.Should().BeNull();
    }

    [Fact]
    public async Task Given_WithinCooldown_When_Check_Then_DeniedWithCooldownReason()
    {
        var userId = Guid.NewGuid();
        var keyHash = Hash($"user:{userId:N}");
        var dayUtc = _now.Date;

        var last = _now.AddMinutes(-3); // 7 minutes left in cooldown
        _repo.Setup(r => r.GetTodayAsync(It.Is<byte[]>(b => b.SequenceEqual(keyHash)),
                                         (byte)EmailKind.Verification, dayUtc, It.IsAny<CancellationToken>()))
             .ReturnsAsync(new EmailRateLimitRow
             {
                 KeyHash = keyHash,
                 Kind = (byte)EmailKind.Verification,
                 DateUtc = dayUtc,
                 SentCount = 1,
                 LastSentAtUtc = DateTime.SpecifyKind(last, DateTimeKind.Unspecified) // exercise SpecifyKind(path)
             });

        var limiter = SUT();
        var decision = await limiter.CheckAsync(userId, EmailKind.Verification, CancellationToken.None);

        decision.Allowed.Should().BeFalse();
        var expectedSeconds = (int)TimeSpan.FromMinutes(7).TotalSeconds;
        decision.Reason.Should().Be($"cooldown:{expectedSeconds}s");
    }

    [Fact]
    public async Task Given_AtDailyCap_When_Check_Then_DeniedWithDailyLimitReason()
    {
        var userId = Guid.NewGuid();
        var keyHash = Hash($"user:{userId:N}");
        var dayUtc = _now.Date;

        _repo.Setup(r => r.GetTodayAsync(It.Is<byte[]>(b => b.SequenceEqual(keyHash)),
                                        (byte)EmailKind.Verification, dayUtc, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmailRateLimitRow
            {
                KeyHash = keyHash,
                Kind = (byte)EmailKind.Verification,
                DateUtc = dayUtc,
                SentCount = _opt.Value.DailyLimit,
                LastSentAtUtc = _now.AddHours(-1)
            });

        var limiter = SUT();
        var decision = await limiter.CheckAsync(userId, EmailKind.Verification, CancellationToken.None);

        decision.Allowed.Should().BeFalse();
        decision.Reason.Should().Be($"daily_limit:{_opt.Value.DailyLimit}");
    }


    [Fact]
    public async Task Given_AfterCooldown_And_UnderCap_When_Check_Then_Allowed()
    {
        var userId = Guid.NewGuid();
        var keyHash = Hash($"user:{userId:N}");
        var dayUtc = _now.Date;

        _repo.Setup(r => r.GetTodayAsync(It.Is<byte[]>(b => b.SequenceEqual(keyHash)),
                                        (byte)EmailKind.Verification, dayUtc, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmailRateLimitRow
            {
                KeyHash = keyHash,
                Kind = (byte)EmailKind.Verification,
                DateUtc = dayUtc,
                SentCount = 1,
                LastSentAtUtc = _now.AddMinutes(-11)
            });

        var limiter = SUT();
        var decision = await limiter.CheckAsync(userId, EmailKind.Verification, CancellationToken.None);

        decision.Allowed.Should().BeTrue();
        decision.Reason.Should().BeNull();
    }

    // ------------- MARK (Guid) -------------

    [Fact]
    public async Task Given_MarkSent_GuidKey_Then_UpsertsWithCorrectHashAndDates()
    {
        var userId = Guid.NewGuid();
        var keyHash = Hash($"user:{userId:N}");
        var dayUtc = _now.Date;

        _repo.Setup(r => r.UpsertMarkSentAsync(It.Is<byte[]>(b => b.SequenceEqual(keyHash)),
                                                (byte)EmailKind.Verification,
                                                It.Is<DateTime>(d => d == dayUtc),
                                                It.Is<DateTime>(t => t == _now),
                                                It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask)
             .Verifiable();

        var limiter = SUT();
        await limiter.MarkSentAsync(userId, EmailKind.Verification, new DateTimeOffset(_now, TimeSpan.Zero), CancellationToken.None);

        _repo.Verify();
    }

    // ------------- CHECK + MARK (string key) -------------

    [Fact]
    public async Task Given_StringKey_Normalization_When_Check_Then_UsesLowerTrimmedHash()
    {
        var keyRaw = "  User@Example.Com  ";
        var norm = "user@example.com";
        var keyHash = Hash(norm);
        var dayUtc = _now.Date;

        _repo.Setup(r => r.GetTodayAsync(It.Is<byte[]>(b => b.SequenceEqual(keyHash)),
                                        (byte)EmailKind.Verification, dayUtc, It.IsAny<CancellationToken>()))
            .ReturnsAsync((EmailRateLimitRow?)null)
            .Verifiable();

        var limiter = SUT();
        var decision = await limiter.CheckAsync(keyRaw, EmailKind.Verification, CancellationToken.None);

        decision.Allowed.Should().BeTrue();
        _repo.Verify();
    }

    [Fact]
    public async Task Given_StringKey_Normalization_When_MarkSent_Then_UsesLowerTrimmedHash()
    {
        var keyRaw = "  User@Example.Com  ";
        var norm = "user@example.com";
        var keyHash = Hash(norm);
        var dayUtc = _now.Date;

        _repo.Setup(r => r.UpsertMarkSentAsync(It.Is<byte[]>(b => b.SequenceEqual(keyHash)),
                                            (byte)EmailKind.Verification, dayUtc, _now, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Verifiable();

        var limiter = SUT();
        await limiter.MarkSentAsync(keyRaw, EmailKind.Verification, new DateTimeOffset(_now, TimeSpan.Zero), CancellationToken.None);

        _repo.Verify();
    }
}
