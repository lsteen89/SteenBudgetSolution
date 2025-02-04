using Backend.Infrastructure.Models;

namespace Backend.Infrastructure.Data.Sql.Interfaces
{
    public interface IRefreshTokenSqlExecutor
    {
        Task<bool> AddRefreshTokenAsync(Guid persoid, string hashedRefreshToken, DateTime refreshTokenExpiry);
        Task<JwtTokenModel> GetRefreshTokenAsync(Guid persoid);
        Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration);
        Task<bool> IsTokenBlacklistedAsync(string jti);
        Task<bool> UpdateRefreshTokenExpiryAsync(Guid persoid, DateTime newExpiry);
        Task<bool> ExpireRefreshTokenAsync(Guid persoid);
    }
}
