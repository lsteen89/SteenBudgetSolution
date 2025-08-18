using Backend.Infrastructure.Entities.Tokens;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Application.Abstractions.Infrastructure.Data;
using Dapper;
using Backend.Domain.Shared;

namespace Backend.Infrastructure.Repositories.Auth.RefreshTokens;

public sealed class RefreshTokenRepository : SqlBase, IRefreshTokenRepository
{

    public RefreshTokenRepository(IUnitOfWork unitOfWork, ILogger<RefreshTokenRepository> logger)
        : base(unitOfWork, logger) { }


    public Task<int> RevokeSessionAsync(Guid persoid, Guid sessionId, DateTime nowUtc, CancellationToken ct)
    {
        EnsureTransaction();
        return ExecuteAsync("""
        UPDATE RefreshTokens
            SET Status = @Revoked, RevokedUtc = @Now
            WHERE Persoid = @Perso AND SessionId = @Sess AND Status = @Active;
        """,
        new { Perso = persoid, Sess = sessionId, Now = nowUtc, Active = (int)TokenStatus.Active, Revoked = (int)TokenStatus.Revoked }, ct);
    }

    public Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct)
        => ExecuteAsync("""
        UPDATE RefreshTokens
            SET Status = @Revoked, RevokedUtc = @Now
            WHERE Persoid = @Perso AND Status = @Active;
        """,
        new { Perso = persoid, Now = nowUtc, Active = (int)TokenStatus.Active, Revoked = (int)TokenStatus.Revoked }, ct);
    // Used by login flow
    /// <summary>
    /// Inserts a refresh token for the login flow.
    /// </summary>
    /// Only used during login to create a new refresh token.
    public async Task<int> InsertAsync(RefreshJwtTokenEntity token, CancellationToken ct)
    {
        const string sql = """
        INSERT INTO RefreshTokens
            (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti,
            ExpiresRollingUtc, ExpiresAbsoluteUtc, RevokedUtc, Status, IsPersistent,
            DeviceId, UserAgent, CreatedUtc)
        VALUES
            (@TokenId, @Persoid, @SessionId, @HashedToken, @AccessTokenJti,
            @ExpiresRollingUtc, @ExpiresAbsoluteUtc, @RevokedUtc, @Status, @IsPersistent,
            @DeviceId, @UserAgent, @CreatedUtc);
        """;

        try
        {
            return await ExecuteAsync(sql, token, ct);
        }
        catch (MySqlConnector.MySqlException ex) when (ex.Number == 1062)
        {
            // Throw a custom exception that is database-agnostic.
            // This is the ideal pattern for Clean Architecture.
            // We are deliberately not throwing the original MySqlException.
            throw new DuplicateKeyException("Duplicate entry for refresh token hash.", ex);
        }
    }

    public Task<RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct)
        => QuerySingleOrDefaultAsync<RefreshJwtTokenEntity>(
        """
        SELECT TokenId, Persoid, SessionId, HashedToken, AccessTokenJti,
               DeviceId, UserAgent, ExpiresRollingUtc, ExpiresAbsoluteUtc,
               Status, IsPersistent, CreatedUtc, RevokedUtc
        FROM RefreshTokens
        WHERE SessionId = @SessionId
          AND HashedToken = @Hash
          AND Status = @Active
          AND RevokedUtc IS NULL
          AND ExpiresAbsoluteUtc >= @Now
          AND ExpiresRollingUtc  >= @Now
        LIMIT 1
        FOR UPDATE;
        """, new { SessionId = sessionId, Hash = cookieHash, Now = nowUtc, Active = (int)TokenStatus.Active }, ct);

    public Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct)
    {
        EnsureTransaction();
        return ExecuteAsync(
        """
        UPDATE RefreshTokens
           SET HashedToken       = @NewHash,
               AccessTokenJti    = @NewJti,
               ExpiresRollingUtc = @NewRolling
         WHERE TokenId    = @Id
           AND HashedToken = @OldHash
           AND Status      = @Active;
        """,
        new { Id = tokenId, OldHash = oldHash, NewHash = newHash, NewJti = newAccessJti, NewRolling = newRollingUtc, Active = (int)TokenStatus.Active }, ct);
    }

    public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct)
        => ExecuteAsync(
        """
        UPDATE RefreshTokens
           SET Status = @Revoked, RevokedUtc = @Now
         WHERE TokenId = @Id AND Status = @Active;
        """, new { Id = tokenId, Now = nowUtc, Active = (int)TokenStatus.Active, Revoked = (int)TokenStatus.Revoked }, ct);

    #region  Expired Tokens
    public async Task<IEnumerable<RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize = 1000, CancellationToken ct = default)
    {
        try
        {
            var now = DateTime.UtcNow;

            // Query the database for expired tokens
            string sql = """
                SELECT  PersoId,
                        SessionId,
                        HashedToken,
                        AccessTokenJti,
                        ExpiresRollingUtc,
                        ExpiresAbsoluteUtc,
                        DeviceId,
                        UserAgent
                FROM    RefreshTokens
                WHERE   ExpiresRollingUtc < @Now
                    OR   ExpiresAbsoluteUtc < @Now
                ORDER BY ExpiresRollingUtc ASC          -- earliest expiries first
                LIMIT @BatchSize;
                """;

            var p = new DynamicParameters();
            p.Add("Now", now);
            p.Add("BatchSize", batchSize);
            return await QueryAsync<RefreshJwtTokenEntity>(sql, p, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying expired tokens.");
            throw;
        }
    }

    public async Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct)
    {
        const string sql = "DELETE FROM RefreshTokens WHERE HashedToken = @RefreshToken";
        int rowsAffected = 0; // Declare and initialize the variable

        try
        {
            rowsAffected = await ExecuteAsync(sql, new { RefreshToken = refreshToken }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while deleting token with refresh token: {RefreshToken}", refreshToken);
            return false;
        }

        if (rowsAffected == 0)
        {
            _logger.LogWarning("No token found for deletion with the provided refresh token.");
        }
        else
        {
            _logger.LogInformation("Token deleted successfully for refresh token: {RefreshToken}", refreshToken);
        }

        return rowsAffected > 0;
    }
    #endregion

    public async Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        if (string.IsNullOrEmpty(accessTokenJti))
            throw new ArgumentException("Access token JTI cannot be null or empty.", nameof(accessTokenJti));

        const string sql = "SELECT COUNT(1) FROM RefreshTokens WHERE AccessTokenJti = @AccessTokenJti AND RefreshTokenExpiryDate > @Now";
        var parameters = new { AccessTokenJti = accessTokenJti, Now = now };

        // Await the task to get the integer result, then compare it.
        int count = await ExecuteScalarAsync<int>(sql, parameters, ct);
        return count > 0;
    }
}

