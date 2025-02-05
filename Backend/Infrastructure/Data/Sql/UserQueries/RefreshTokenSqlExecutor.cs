using Backend.Infrastructure.Data.Sql.Interfaces;
using System.Data.Common;
using Backend.Infrastructure.Data.Sql.Provider;
using System.Security.Cryptography.X509Certificates;
using Backend.Domain.Entities;
using Backend.Infrastructure.Models;
using Backend.Infrastructure.Interfaces;
using Dapper;

namespace Backend.Infrastructure.Data.Sql.UserQueries
{
    public class RefreshTokenSqlExecutor : SqlBase, IRefreshTokenSqlExecutor
    {
        private readonly ITimeProvider _timeProvider;
        public RefreshTokenSqlExecutor(DbConnection connection, ILogger<RefreshTokenSqlExecutor> logger, ITimeProvider timeProvider)
            : base(connection, logger)
        {
            _timeProvider = timeProvider;
        }
        public async Task<bool> AddRefreshTokenAsync(Guid persoid, string hashedRefreshToken, DateTime refreshTokenExpiry)
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
        public async Task<JwtTokenModel> GetRefreshTokenAsync(string refreshToken)
        {
            string sql = "SELECT Persoid, RefreshToken, ExpiryDate FROM RefreshTokens WHERE RefreshToken = @RefreshToken";
            return await QueryFirstOrDefaultAsync<JwtTokenModel>(sql, new { RefreshToken = refreshToken });
        }
        public async Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration)
        {
            try
            {
                _logger.LogInformation("Adding blacklisted token for Jti: {Jti}", jti);
                string sql = "INSERT INTO BlacklistedTokens (Jti, ExpiryDate) VALUES (@Jti, @ExpiryDate) ";
                int rowsAffected = await ExecuteAsync(sql, new
                {
                    Jti = jti,
                    ExpiryDate = expiration,
                });
                _logger.LogInformation("Blacklisted token added successfully for Jti: {Jti}", jti);
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding blacklisted token for Jti: {Jti}", jti);
                return false;
            }
        }
        public async Task<bool> IsTokenBlacklistedAsync(string jti)
        {
            string sql = "SELECT COUNT(1) FROM BlacklistedTokens WHERE Jti = @Jti";
            int count = await ExecuteScalarAsync<int>(sql, new { Jti = jti });
            return count > 0;
        }
        public async Task<bool> UpdateRefreshTokenExpiryAsync(Guid persoid, DateTime newExpiry)
        {
            string sql = "UPDATE RefreshTokens SET ExpiryDate = @NewExpiry WHERE PersoId = @PersoId";
            int rowsAffected = await _connection.ExecuteAsync(sql, new { NewExpiry = newExpiry, PersoId = persoid });
            return rowsAffected > 0;
        }
        // this method is used to expire a refresh token
        public async Task<bool> ExpireRefreshTokenAsync(Guid persoid)
        {
            // Use ITimeProvider to calculate a new expiry (e.g., one minute in the past)
            DateTime newExpiry = _timeProvider.UtcNow.AddMinutes(-1);
            _logger.LogInformation("Expiring refresh token for Persoid {PersoId} with new expiry {NewExpiry}", persoid, newExpiry);
            return await UpdateRefreshTokenExpiryAsync(persoid, newExpiry);
        }
    }
    
}


