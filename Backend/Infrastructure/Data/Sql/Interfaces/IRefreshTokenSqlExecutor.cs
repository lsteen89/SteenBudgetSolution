using Backend.Infrastructure.Entities;

namespace Backend.Infrastructure.Data.Sql.Interfaces
{
    public interface IRefreshTokenSqlExecutor
    {
        Task<bool> AddRefreshTokenAsync(RefreshJwtTokenEntity refreshJwtTokenEntity);
        Task<IEnumerable<RefreshJwtTokenEntity>> GetRefreshTokensAsync(
                    Guid? persoid = null,
                    string refreshToken = null,
                    string deviceId = null,
                    string userAgent = null);
        Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration);
        Task<bool> IsTokenBlacklistedAsync(string jti);
        Task<bool> UpdateRefreshTokenExpiryAsync(Guid persoid, DateTime newExpiry);
        Task<bool> ExpireRefreshTokenAsync(Guid persoid);
        Task<bool> DeleteTokenAsync(string refreshToken);
        Task<bool> DeleteTokensByUserIdAsync(string userId);
        Task<BlacklistedTokenEntity?> GetBlacklistedTokenByJtiAsync(string? jti);
    }
}
