using Backend.Infrastructure.Data.Sql;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.EmailQueries;

namespace Backend.Infrastructure.Data.Sql.Queries.EmailQueries;

public sealed class EmailRateLimitSqlExecutor : SqlBase, IEmailRateLimitSqlExecutor
{
    public EmailRateLimitSqlExecutor(IUnitOfWork uow, ILogger<EmailRateLimitSqlExecutor> log)
        : base(uow, log) { }

    public Task<EmailRateLimitRow?> GetTodayAsync(Guid persoid, byte emailKind, DateOnly dateUtc, CancellationToken ct)
        => QuerySingleOrDefaultAsync<EmailRateLimitRow>(@"
        SELECT sent_count AS SentCount, last_sent_at AS LastSentAtUtc
        FROM email_send_limits
        WHERE user_id = @PersoId AND email_kind = @Kind AND `date` = @Date
        LIMIT 1;",
            new { PersoId = persoid.ToString(), Kind = emailKind, Date = dateUtc.ToDateTime(TimeOnly.MinValue) }, ct);

    public Task UpsertMarkSentAsync(Guid persoid, byte emailKind, DateOnly dateUtc, DateTime nowUtc, CancellationToken ct)
        => ExecuteAsync(@"
        INSERT INTO email_send_limits (user_id, email_kind, `date`, sent_count, last_sent_at)
        VALUES (@PersoId, @Kind, @Date, 1, @Now)
        ON DUPLICATE KEY UPDATE
        sent_count = sent_count + 1,
        last_sent_at = VALUES(last_sent_at);",
            new { PersoId = persoid.ToString(), Kind = emailKind, Date = dateUtc.ToDateTime(TimeOnly.MinValue), Now = DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc) }, ct);

    public Task<int> CleanupAsync(int retentionDays, CancellationToken ct)
        => ExecuteAsync(@"DELETE FROM email_send_limits WHERE `date` < (UTC_DATE() - INTERVAL @Days DAY);",
                        new { Days = retentionDays }, ct);
}
