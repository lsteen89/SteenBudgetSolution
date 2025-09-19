using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Options.Email;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Email;

namespace Backend.Infrastructure.Email;

public sealed class EmailRateLimiter : IEmailRateLimiter
{
    private readonly IEmailRateLimitRepository _repo;
    private readonly EmailRateLimitOptions _opt;
    private readonly ITimeProvider _clock;
    private readonly ILogger<EmailRateLimiter> _log;

    public EmailRateLimiter(
        IEmailRateLimitRepository repo,
        IOptions<EmailRateLimitOptions> opt,
        ITimeProvider clock,
        ILogger<EmailRateLimiter> log)
    {
        _repo = repo; _opt = opt.Value; _clock = clock; _log = log;
    }

    // Guid overloads
    public Task<RateLimitDecision> CheckAsync(Guid userId, EmailKind kind, CancellationToken ct)
        => CheckCoreAsync(Hash($"user:{userId:N}"), kind, ct);

    public Task MarkSentAsync(Guid userId, EmailKind kind, DateTimeOffset at, CancellationToken ct)
        => MarkCoreAsync(Hash($"user:{userId:N}"), kind, at, ct);

    // String overloads
    public Task<RateLimitDecision> CheckAsync(string key, EmailKind kind, CancellationToken ct)
        => CheckCoreAsync(Hash(Normalize(key)), kind, ct);

    public Task MarkSentAsync(string key, EmailKind kind, DateTimeOffset at, CancellationToken ct)
        => MarkCoreAsync(Hash(Normalize(key)), kind, at, ct);

    // Core
    private async Task<RateLimitDecision> CheckCoreAsync(byte[] keyHash, EmailKind kind, CancellationToken ct)
    {
        var now = _clock.UtcNow;
        var todayUtc = now.Date;
        var row = await _repo.GetTodayAsync(keyHash, (byte)kind, todayUtc, ct);
        if (row is null) return new(true);

        if (row.SentCount >= _opt.DailyLimit) return new(false, $"daily_limit:{_opt.DailyLimit}");

        var elapsed = now - DateTime.SpecifyKind(row.LastSentAtUtc, DateTimeKind.Utc);
        var cooldown = TimeSpan.FromMinutes(_opt.CooldownPeriodMinutes);
        return elapsed < cooldown ? new(false, $"cooldown:{(int)(cooldown - elapsed).TotalSeconds}s") : new(true);
    }

    private Task MarkCoreAsync(byte[] keyHash, EmailKind kind, DateTimeOffset at, CancellationToken ct)
        => _repo.UpsertMarkSentAsync(keyHash, (byte)kind, at.UtcDateTime.Date, at.UtcDateTime, ct);

    // Helpers
    private static string Normalize(string s) => s.Trim().ToLowerInvariant();
    private static byte[] Hash(string s) => System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(s));
}
