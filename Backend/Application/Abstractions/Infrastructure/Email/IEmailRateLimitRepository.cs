using Backend.Infrastructure.Entities.Email;
namespace Backend.Application.Abstractions.Infrastructure.Email;

public interface IEmailRateLimitRepository
{
    Task<EmailRateLimitRow?> GetTodayAsync(byte[] keyHash, byte kind, DateTime dayUtc, CancellationToken ct);
    Task UpsertMarkSentAsync(byte[] keyHash, byte kind, DateTime dayUtc, DateTime lastSentAtUtc, CancellationToken ct);
    Task<int> CleanupAsync(int retentionDays, CancellationToken ct);
}