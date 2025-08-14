namespace Backend.Application.Abstractions.Infrastructure.RateLimiting;

public enum EmailKind : byte { Verification = 1, Contact = 2 }

public sealed record RateLimitDecision(bool Allowed, string? Reason = null);

public interface IEmailRateLimiter
{
    // user-scoped (Guid)
    Task<RateLimitDecision> CheckAsync(Guid userId, EmailKind kind, CancellationToken ct);
    Task MarkSentAsync(Guid userId, EmailKind kind, DateTimeOffset sentAtUtc, CancellationToken ct);

    // anonymous/string-scoped (email/ip)
    Task<RateLimitDecision> CheckAsync(string key, EmailKind kind, CancellationToken ct);
    Task MarkSentAsync(string key, EmailKind kind, DateTimeOffset sentAtUtc, CancellationToken ct);
}
