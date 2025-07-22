using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Entities.Tokens;
using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries
{
    public interface IRefreshTokenSqlExecutor
    {
        Task<bool> UpsertRefreshTokenAsync(RefreshJwtTokenEntity refreshJwtTokenEntity, DbConnection conn, DbTransaction tx);
        Task<IEnumerable<RefreshJwtTokenEntity>> GetRefreshTokensAsync(
                    DbConnection conn, // Note that both conn and tx are required here
                    DbTransaction tx,
                    Guid? persoId = null,          // user
                    string hashedToken = null,          // SHA-256 from client
                    Guid? sessionId = null,          // device/browser
                    bool onlyActive = true          // filter out revoked if not overridden / 
                    );
        Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration, DbConnection conn, DbTransaction tx);
        Task<bool> IsTokenBlacklistedAsync(string jti, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> UpdateRollingExpiryAsync(Guid persoid, Guid sessionId, DateTime newExpiryUtc, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> UpdateAbsoluteExpiryAsync(Guid persoid, Guid sessionId, DbConnection conn, DbTransaction tx, DateTime? whenUtc = null);
        Task<bool> RevokeRefreshTokenAsync(Guid persoid, Guid session, DbConnection? c = null, DbTransaction? tx = null);
        Task<bool> DeleteTokenAsync(string refreshToken, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> DeleteTokensByUserIdAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null);
        Task<BlacklistedTokenEntity?> GetBlacklistedTokenByJtiAsync(string? jti, DbConnection? conn = null, DbTransaction? tx = null);
        Task<IEnumerable<RefreshJwtTokenEntity>> GetExpiredTokensAsync(DbConnection? conn = null, DbTransaction? tx = null, int batchSize = 1000);
        Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, DbConnection? conn = null, DbTransaction? tx = null);

        /// <summary>
        /// Returns all rows from the archive for the given user+session.
        /// </summary>
        Task<IReadOnlyList<RefreshJwtTokenArchiveEntity>> GetArchivedTokensAsync(
            Guid persoId,
            Guid sessionId,
            DbConnection? conn = null,
            DbTransaction? tx = null);

        Task<int> CountRefreshTokensAsync(
            Guid persoId,
            Guid? sessionId = null,
            bool onlyActive = true,
            DbConnection? conn = null,
            DbTransaction? tx = null);

    }
}
