using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Data.BaseClass;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Auth.VerificationTokens;

// Repository for managing verification tokens
// This repository handles operations related to verification tokens such as creation, retrieval, and deletion.
// Verification tokens are short-lived, single-use tokens used for email verification, password reset, etc

// It is distinct from refresh tokens, which are used for maintaining user sessions.
// DO NOT CONFUSE WITH REFRESH TOKENS.

public sealed class VerificationTokenRepository : SqlBase, IVerificationTokenRepository
{
    public VerificationTokenRepository(IUnitOfWork uow, ILogger<VerificationTokenRepository> log, IOptions<DatabaseSettings> db)
        : base(uow, log, db) { }

    // Requires UNIQUE (PersoId) on VerificationToken
    public Task<int> UpsertSingleActiveAsync(Guid persoid, Guid token, DateTime expiryUtc, CancellationToken ct)
        => ExecuteAsync("""
            INSERT INTO VerificationToken (PersoId, Token, TokenExpiryDate)
            VALUES (@PersoId, @Token, @Expiry)
            ON DUPLICATE KEY UPDATE
                Token            = VALUES(Token),
                TokenExpiryDate  = VALUES(TokenExpiryDate);
            """, new { PersoId = persoid, Token = token, Expiry = expiryUtc }, ct);

    public Task<UserTokenModel?> GetByTokenAsync(Guid token, CancellationToken ct)
        => QuerySingleOrDefaultAsync<UserTokenModel>(
            "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE Token = @Token LIMIT 1;",
            new { Token = token }, ct);

    public Task<UserTokenModel?> GetByUserAsync(Guid persoid, CancellationToken ct)
        => QuerySingleOrDefaultAsync<UserTokenModel>(
            "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE PersoId = @PersoId LIMIT 1;",
            new { PersoId = persoid }, ct);

    public Task<int> DeleteByTokenAsync(Guid token, CancellationToken ct)
        => ExecuteAsync("DELETE FROM VerificationToken WHERE Token = @Token;", new { Token = token }, ct);

    public Task<int> DeleteAllForUserAsync(Guid persoid, CancellationToken ct)
        => ExecuteAsync("DELETE FROM VerificationToken WHERE PersoId = @PersoId;", new { PersoId = persoid }, ct);
}

