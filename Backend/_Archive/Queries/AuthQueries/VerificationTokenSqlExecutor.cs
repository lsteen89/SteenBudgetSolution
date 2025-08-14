using Dapper;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Data.Sql;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Domain.Entities.User;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.AuthQueries;

namespace Backend.Infrastructure.Data.Sql.Queries.Auth;

public sealed class VerificationTokenSqlExecutor : SqlBase, IVerificationTokenSqlExecutor
{
    // NEW (preferred)
    public VerificationTokenSqlExecutor(IUnitOfWork uow, ILogger<VerificationTokenSqlExecutor> logger)
        : base(uow, logger) { }

    // Requires UNIQUE(PersoId)
    public Task<int> UpsertSingleActiveAsync(Guid persoid, Guid token, DateTime expiryUtc, CancellationToken ct)
        => ExecuteAsync(@"
        INSERT INTO VerificationToken (PersoId, Token, TokenExpiryDate)
        VALUES (@PersoId, @Token, @Expiry)
        ON DUPLICATE KEY UPDATE
        Token = VALUES(Token),
        TokenExpiryDate = VALUES(TokenExpiryDate);",
            new { PersoId = persoid, Token = token, Expiry = expiryUtc }, ct);

    public Task<UserTokenModel?> GetTokenAsync(Guid? persoid = null, Guid? token = null, CancellationToken ct = default)
    {
        string sql;
        object parameters;

        // Prioritize lookup by the unique token GUID, as it's the primary use case.
        if (token.HasValue)
        {
            sql = "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE Token = @Token;";
            parameters = new { Token = token.Value };
        }
        else if (persoid.HasValue)
        {
            sql = "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE PersoId = @PersoId;";
            parameters = new { PersoId = persoid.Value };
        }
        else
        {
            // If no identifier is provided, return null immediately.
            _logger.LogWarning("GetTokenAsync was called without any identifiers.");
            return Task.FromResult<UserTokenModel?>(null);
        }

        return QueryFirstOrDefaultAsync<UserTokenModel>(sql, parameters, ct);
    }

    public Task<int> DeleteTokenAsync(Guid persoid, CancellationToken ct)
        => ExecuteAsync("DELETE FROM VerificationToken WHERE PersoId = @persoid;",
                        new { UserId = persoid }, ct);
    [Obsolete("This method is deprecated and should not be used in production. Once the new email service is fully implemented, this method will be removed. Not sure this ever worked. Is here to ensure compatibility with legacy code.")]
    public Task<UserModel> GetUserFromResetTokenAsync(Guid token, CancellationToken ct)
    {
        return QueryFirstOrDefaultAsync<UserModel>(
            "SELECT PersoId FROM VerificationToken WHERE Token = @Token;",
            new { Token = token }, ct);
    }
}
