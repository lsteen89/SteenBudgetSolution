using Backend.Infrastructure.Data.Sql.Interfaces;
using System.Data.Common;
using Backend.Infrastructure.Data.Sql.Provider;
using System.Security.Cryptography.X509Certificates;
using Backend.Domain.Entities;
using Backend.Infrastructure.Models;

namespace Backend.Infrastructure.Data.Sql.UserQueries
{
    public class RefreshTokenSqlExecutor : SqlBase, IRefreshTokenSqlExecutor
    {
        public RefreshTokenSqlExecutor(DbConnection connection, ILogger<RefreshTokenSqlExecutor> logger)
            : base(connection, logger)
        {
            
        }
        public async Task<bool> AddRefreshTokenAsync(string persoid, string hashedRefreshToken, DateTime refreshTokenExpiry)
        {
            try
            {
                _logger.LogInformation("Adding refresh token for PersoId: {PersoId}", persoid);
                string sql = "INSERT INTO RefreshTokens (PersoId, RefreshToken, ExpiryDate, CreatedBy, CreatedTime) " +
                    "VALUES (@PersoId, @RefreshToken, @ExpiryDate, @CreatedBy, @CreatedTime)";
                int rowsAffected = await ExecuteAsync(sql, new
                {
                    PersoId = persoid,
                    RefreshToken = hashedRefreshToken,
                    ExpiryDate = refreshTokenExpiry,
                    CreatedBy = "System",
                    CreatedTime = DateTime.UtcNow
                });
                _logger.LogInformation("Refresh token added successfully for PersoId: {PersoId}", persoid);
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding refresh token for PersoId: {PersoId}", persoid);
                return false;
            }
        }
        public async Task<JwtTokenModel> GetRefreshTokenAsync(Guid persoid)
        {
            string sql = "SELECT Persoid, RefreshToken, ExpiryDate FROM RefreshTokens WHERE PersoId = @PersoId";
            return await QueryFirstOrDefaultAsync<JwtTokenModel>(sql, new { PersoId = persoid });
        }
    }
    
}


