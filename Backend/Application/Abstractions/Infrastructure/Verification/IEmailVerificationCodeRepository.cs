namespace Backend.Application.Abstractions.Infrastructure.Verification;

public sealed record EmailVerificationCodeState(
    byte[] CodeHash,
    DateTime ExpiresAtUtc,
    int AttemptCount,
    DateTime? LockedUntilUtc,
    int SentCount,
    DateTime? LastSentAtUtc
);

public interface IEmailVerificationCodeRepository
{
    Task UpsertActiveAsync(Guid persoId, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct);
    Task<EmailVerificationCodeState?> GetByUserAsync(Guid persoId, CancellationToken ct);
    Task IncrementFailureAsync(Guid persoId, int newAttemptCount, DateTime? lockedUntilUtc, CancellationToken ct);
    Task MarkSentAsync(Guid persoId, DateTime nowUtc, CancellationToken ct);
    Task DeleteAsync(Guid persoId, CancellationToken ct);
    Task UpsertActiveForRegisterAsync(Guid persoId, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct);
    Task UpsertActiveForResendAsync(Guid persoId, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct);

}
