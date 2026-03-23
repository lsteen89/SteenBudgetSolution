namespace Backend.Application.Abstractions.Infrastructure.EmailOutbox;


public interface IEmailOutboxRepository
{
    Task EnqueueAsync(EnqueueEmailOutboxRequest request, CancellationToken ct);

    Task<IReadOnlyList<EmailOutboxItem>> ClaimDueAsync(
        Guid workerId,
        int take,
        DateTime nowUtc,
        TimeSpan lockFor,
        CancellationToken ct);

    Task MarkSentAsync(long id, string? providerId, DateTime nowUtc, CancellationToken ct);

    Task MarkFailedAsync(MarkEmailOutboxFailedRequest request, CancellationToken ct);
}
