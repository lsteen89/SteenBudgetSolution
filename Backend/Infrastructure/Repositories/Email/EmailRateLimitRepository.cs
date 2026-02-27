using Backend.Infrastructure.Data.BaseClass;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Entities.Email;
using Backend.Application.Abstractions.Infrastructure.Email;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Email;

public sealed class EmailRateLimitRepository : SqlBase, IEmailRateLimitRepository
{
    public EmailRateLimitRepository(IUnitOfWork uow, ILogger<EmailRateLimitRepository> log, IOptions<DatabaseSettings> db) : base(uow, log, db) { }

    public async Task<EmailRateLimitRow?> GetTodayAsync(byte[] keyHash, byte kind, DateTime dayUtc, CancellationToken ct)
    {
        const string sql = @"
            SELECT SentCount, LastSentAtUtc
            FROM EmailRateLimits
            WHERE KeyHash = @KeyHash AND Kind = @Kind AND DateUtc = @DateUtc;";

        return await QuerySingleOrDefaultAsync<EmailRateLimitRow>(
            sql,
            new { KeyHash = keyHash, Kind = kind, DateUtc = dayUtc.Date },
            ct);
    }

    public async Task UpsertMarkSentAsync(byte[] keyHash, byte kind, DateTime dayUtc, DateTime lastSentAtUtc, CancellationToken ct)
    {
        const string sql = @"
            INSERT INTO EmailRateLimits (KeyHash, Kind, DateUtc, SentCount, LastSentAtUtc)
            VALUES (@KeyHash, @Kind, @DateUtc, 1, @LastSentAtUtc)
            ON DUPLICATE KEY UPDATE
                SentCount = SentCount + 1,
                LastSentAtUtc = GREATEST(LastSentAtUtc, @LastSentAtUtc);";

        await ExecuteAsync(sql, new
        {
            KeyHash = keyHash,
            Kind = kind,
            DateUtc = dayUtc.Date,
            LastSentAtUtc = DateTime.SpecifyKind(lastSentAtUtc, DateTimeKind.Utc)
        }, ct);
    }

    public Task<int> CleanupAsync(int retentionDays, CancellationToken ct)
        => ExecuteAsync("DELETE FROM EmailRateLimits WHERE DateUtc < (CURRENT_DATE - INTERVAL @Days DAY);",
                        new { Days = retentionDays }, ct);
}
