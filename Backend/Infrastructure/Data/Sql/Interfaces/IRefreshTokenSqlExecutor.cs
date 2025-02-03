using Backend.Infrastructure.Models;

namespace Backend.Infrastructure.Data.Sql.Interfaces
{
    public interface IRefreshTokenSqlExecutor
    {
        Task<bool> AddRefreshTokenAsync(string persoid, string hashedRefreshToken, DateTime refreshTokenExpiry);
        Task<JwtTokenModel> GetRefreshTokenAsync(Guid persoid);
    }
}
