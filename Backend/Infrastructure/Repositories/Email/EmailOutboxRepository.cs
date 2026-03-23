using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.EmailOutbox;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Email;

public sealed class EmailOutboxRepository : SqlBase, IEmailOutboxRepository
{
    public EmailOutboxRepository(
        IUnitOfWork unitOfWork,
        ILogger<EmailOutboxRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db) { }

    public async Task EnqueueAsync(EnqueueEmailOutboxRequest request, CancellationToken ct)
    {
        const string sql = @"
INSERT INTO EmailOutbox
  (Kind, ToEmail, Subject, BodyHtml, Attempts, NextAttemptAtUtc, CreatedAtUtc)
VALUES
  (@Kind, @ToEmail, @Subject, @BodyHtml, 0, @NowUtc, @NowUtc);
";
        await ExecuteAsync(sql, new
        {
            Kind = request.Kind,
            ToEmail = request.ToEmail.Trim(),
            Subject = request.Subject,
            BodyHtml = request.BodyHtml,
            NowUtc = request.NowUtc
        }, ct);
    }

    public async Task<IReadOnlyList<EmailOutboxItem>> ClaimDueAsync(Guid workerId, int take, DateTime nowUtc, TimeSpan lockFor, CancellationToken ct)
    {
        // Claim rows (atomic-ish in MySQL/MariaDB): UPDATE with ORDER BY + LIMIT
        // Then fetch only what we just claimed.
        var lockUntil = nowUtc.Add(lockFor);

        const string claimSql = @"
UPDATE EmailOutbox
SET LockedBy = @WorkerId,
    LockedUntilUtc = @LockUntil
WHERE SentAtUtc IS NULL
  AND NextAttemptAtUtc <= @NowUtc
  AND (LockedUntilUtc IS NULL OR LockedUntilUtc <= @NowUtc)
ORDER BY NextAttemptAtUtc ASC, Id ASC
LIMIT @Take;
";

        const string fetchSql = @"
SELECT
  Id, Kind, ToEmail, Subject, BodyHtml, Attempts
FROM EmailOutbox
WHERE LockedBy = @WorkerId
  AND LockedUntilUtc = @LockUntil
  AND SentAtUtc IS NULL
ORDER BY Id ASC
LIMIT @Take;
";

        // IMPORTANT: This should ideally run in the same connection/transaction.
        // If your IUnitOfWork/SqlBase already ensures that for ITransactionalCommand, you're good.
        await ExecuteAsync(claimSql, new
        {
            WorkerId = workerId,
            LockUntil = lockUntil,
            NowUtc = nowUtc,
            Take = take
        }, ct);

        var rows = await QueryAsync<EmailOutboxItem>(fetchSql, new
        {
            WorkerId = workerId,
            LockUntil = lockUntil,
            Take = take
        }, ct);

        return rows.ToList();
    }

    public async Task MarkSentAsync(long id, string? providerId, DateTime nowUtc, CancellationToken ct)
    {
        const string sql = @"
UPDATE EmailOutbox
SET SentAtUtc = @NowUtc,
    ProviderId = @ProviderId,
    LastError = NULL,
    LockedBy = NULL,
    LockedUntilUtc = NULL
WHERE Id = @Id;
";
        await ExecuteAsync(sql, new { Id = id, ProviderId = providerId, NowUtc = nowUtc }, ct);
    }

    public async Task MarkFailedAsync(MarkEmailOutboxFailedRequest request, CancellationToken ct)
    {
        const string sql = @"
UPDATE EmailOutbox
SET Attempts = @Attempts,
    NextAttemptAtUtc = @NextAttemptAtUtc,
    LastError = @Error,
    LockedBy = NULL,
    LockedUntilUtc = NULL
WHERE Id = @Id;
";
        await ExecuteAsync(sql, new
        {
            Id = request.Id,
            Attempts = request.Attempts,
            NextAttemptAtUtc = request.NextAttemptAtUtc,
            Error = request.Error,
            NowUtc = request.NowUtc
        }, ct);
    }
}
