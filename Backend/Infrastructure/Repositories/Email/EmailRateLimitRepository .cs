using Backend.Infrastructure.Data.BaseClass;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Entities.Email;
using Backend.Application.Abstractions.Infrastructure.Email;

namespace Backend.Infrastructure.Repositories.Email;

public sealed class EmailRateLimitRepository : SqlBase, IEmailRateLimitRepository
{
    public EmailRateLimitRepository(IUnitOfWork uow, ILogger<EmailRateLimitRepository> log) : base(uow, log) { }

    public Task<EmailRateLimitRow?> GetTodayAsync(byte[] keyHash, byte kind, DateOnly dateUtc, CancellationToken ct)
        => QuerySingleOrDefaultAsync<EmailRateLimitRow>(
            "SELECT KeyHash, Kind, DateUtc, SentCount, LastSentAtUtc FROM EmailRateLimit WHERE KeyHash=@Key AND Kind=@Kind AND DateUtc=@Date LIMIT 1;",
            new { Key = keyHash, Kind = kind, Date = dateUtc }, ct);

    public Task UpsertMarkSentAsync(byte[] keyHash, byte kind, DateOnly dateUtc, DateTime nowUtc, CancellationToken ct)
        => ExecuteAsync("""
            INSERT INTO EmailRateLimit (KeyHash, Kind, DateUtc, SentCount, LastSentAtUtc)
            VALUES (@Key, @Kind, @Date, 1, @Now)
            ON DUPLICATE KEY UPDATE
              SentCount = SentCount + 1,
              LastSentAtUtc = GREATEST(LastSentAtUtc, @Now);
            """, new { Key = keyHash, Kind = kind, Date = dateUtc, Now = nowUtc }, ct);

    public Task<int> CleanupAsync(int retentionDays, CancellationToken ct)
        => ExecuteAsync("DELETE FROM EmailRateLimit WHERE DateUtc < (CURRENT_DATE - INTERVAL @Days DAY);",
                        new { Days = retentionDays }, ct);
}
