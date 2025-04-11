using Backend.Infrastructure.Entities.Tokens;
using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.UserQueries
{
    public interface IRefreshTokenSqlExecutor
    {
        Task<bool> AddRefreshTokenAsync(RefreshJwtTokenEntity refreshJwtTokenEntity, DbConnection? conn = null, DbTransaction? tx = null);
        Task<IEnumerable<RefreshJwtTokenEntity>> GetRefreshTokensAsync(
                    Guid? persoid = null,
                    string refreshToken = null,
                    string sessionId = null,
                    DbConnection? conn = null, 
                    DbTransaction? tx = null);
        Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> IsTokenBlacklistedAsync(string jti, DbConnection? conn = null, DbTransaction? tx = null);
        //Task<bool> UpdateRefreshTokenExpiryAsync(Guid persoid, DateTime newExpiry, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> ExpireRefreshTokenAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> DeleteTokenAsync(string refreshToken, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> DeleteTokensByUserIdAsync(string userId, DbConnection? conn = null, DbTransaction? tx = null);
        Task<BlacklistedTokenEntity?> GetBlacklistedTokenByJtiAsync(string? jti, DbConnection? conn = null, DbTransaction? tx = null);
        Task<IEnumerable<RefreshJwtTokenEntity>> GetExpiredTokensAsync(DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, DbConnection? conn = null, DbTransaction? tx = null);
    }
}
