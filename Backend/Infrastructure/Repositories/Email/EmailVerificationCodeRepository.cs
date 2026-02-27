using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Email;

public sealed class EmailVerificationCodeRepository : SqlBase, IEmailVerificationCodeRepository
{
    public EmailVerificationCodeRepository(
        IUnitOfWork unitOfWork,
        ILogger<EmailVerificationCodeRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db) { }

    public async Task UpsertActiveAsync(Guid persoId, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct)
    {
        const string sql = @"
INSERT INTO EmailVerificationCodes
  (Persoid, CodeHash, ExpiresAtUtc, AttemptCount, LockedUntilUtc, SentCount, LastSentAtUtc, CreatedAtUtc)
VALUES
  (@Persoid, @CodeHash, @ExpiresAtUtc, 0, NULL, 0, NULL, @NowUtc)
ON DUPLICATE KEY UPDATE
  CodeHash = VALUES(CodeHash),
  ExpiresAtUtc = VALUES(ExpiresAtUtc),
  AttemptCount = 0,
  LockedUntilUtc = NULL;
";

        await ExecuteAsync(sql, new
        {
            Persoid = persoId,
            CodeHash = codeHash,
            ExpiresAtUtc = expiresAtUtc,
            NowUtc = nowUtc
        }, ct);
    }

    public async Task<EmailVerificationCodeState?> GetByUserAsync(Guid persoId, CancellationToken ct)
    {
        const string sql = @"
SELECT
  CodeHash,
  ExpiresAtUtc,
  AttemptCount,
  LockedUntilUtc,
  SentCount,
  LastSentAtUtc
FROM EmailVerificationCodes
WHERE Persoid = @Persoid
LIMIT 1;
";

        // If your SqlBase can't map byte[] from BINARY(32), this will still work with Dapper.
        return await QueryFirstOrDefaultAsync<EmailVerificationCodeState>(sql, new { Persoid = persoId }, ct);
    }

    public async Task IncrementFailureAsync(Guid persoId, int newAttemptCount, DateTime? lockedUntilUtc, CancellationToken ct)
    {
        const string sql = @"
UPDATE EmailVerificationCodes
SET AttemptCount = @AttemptCount,
    LockedUntilUtc = @LockedUntilUtc
WHERE Persoid = @Persoid;
";

        await ExecuteAsync(sql, new
        {
            Persoid = persoId,
            AttemptCount = newAttemptCount,
            LockedUntilUtc = lockedUntilUtc
        }, ct);
    }

    public async Task MarkSentAsync(Guid persoId, DateTime nowUtc, CancellationToken ct)
    {
        const string sql = @"
UPDATE EmailVerificationCodes
SET SentCount = SentCount + 1,
    LastSentAtUtc = @NowUtc
WHERE Persoid = @Persoid;
";

        await ExecuteAsync(sql, new { Persoid = persoId, NowUtc = nowUtc }, ct);
    }

    public async Task DeleteAsync(Guid persoId, CancellationToken ct)
    {
        const string sql = "DELETE FROM EmailVerificationCodes WHERE Persoid = @Persoid;";
        await ExecuteAsync(sql, new { Persoid = persoId }, ct);
    }
    public async Task UpsertActiveForResendAsync(Guid persoId, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct)
    {
        const string sql = @"
INSERT INTO EmailVerificationCodes
  (Persoid, CodeHash, ExpiresAtUtc, AttemptCount, LockedUntilUtc, SentCount, LastSentAtUtc, CreatedAtUtc)
VALUES
  (@Persoid, @CodeHash, @ExpiresAtUtc, 0, NULL, 0, NULL, @NowUtc)
ON DUPLICATE KEY UPDATE
  CodeHash = VALUES(CodeHash),
  ExpiresAtUtc = VALUES(ExpiresAtUtc);
";

        await ExecuteAsync(sql, new
        {
            Persoid = persoId,
            CodeHash = codeHash,
            ExpiresAtUtc = expiresAtUtc,
            NowUtc = nowUtc
        }, ct);
    }
    public async Task UpsertActiveForRegisterAsync(Guid persoId, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct)
    {
        const string sql = @"
INSERT INTO EmailVerificationCodes
  (Persoid, CodeHash, ExpiresAtUtc, AttemptCount, LockedUntilUtc, SentCount, LastSentAtUtc, CreatedAtUtc)
VALUES
  (@Persoid, @CodeHash, @ExpiresAtUtc, 0, NULL, 0, NULL, @NowUtc)
ON DUPLICATE KEY UPDATE
  CodeHash = VALUES(CodeHash),
  ExpiresAtUtc = VALUES(ExpiresAtUtc),
  AttemptCount = 0,
  LockedUntilUtc = NULL;
";

        await ExecuteAsync(sql, new
        {
            Persoid = persoId,
            CodeHash = codeHash,
            ExpiresAtUtc = expiresAtUtc,
            NowUtc = nowUtc
        }, ct);
    }
}
