namespace Backend.Application.Abstractions.Infrastructure.EmailOutbox;

public sealed record EmailOutboxItem(
    long Id,
    string Kind,
    string ToEmail,
    string Subject,
    string BodyHtml,
    int Attempts
);

public interface IEmailOutboxRepository
{
    Task EnqueueAsync(string kind, string toEmail, string subject, string bodyHtml, DateTime nowUtc, CancellationToken ct);

    // Claim due rows (safe for multiple workers)
    Task<IReadOnlyList<EmailOutboxItem>> ClaimDueAsync(Guid workerId, int take, DateTime nowUtc, TimeSpan lockFor, CancellationToken ct);

    Task MarkSentAsync(long id, string? providerId, DateTime nowUtc, CancellationToken ct);
    Task MarkFailedAsync(long id, int attempts, DateTime nextAttemptAtUtc, string error, DateTime nowUtc, CancellationToken ct);
}
