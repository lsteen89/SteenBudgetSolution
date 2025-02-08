using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Interfaces;
using Dapper;
using System.Data.Common;
using Backend.Infrastructure.Entities;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.Http.HttpResults;

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
        public async Task<bool> AddRefreshTokenAsync(RefreshJwtTokenEntity refreshJwtTokenEntity)
        {
            try
            {
                _logger.LogInformation("Adding refresh token for PersoId: {PersoId}", refreshJwtTokenEntity.Persoid);
                string sql = @"INSERT INTO RefreshTokens 
                                (PersoId, RefreshToken, ExpiryDate, DeviceId, UserAgent, CreatedBy, CreatedTime) 
                            VALUES 
                                (@PersoId, @RefreshToken, @ExpiryDate, @DeviceId, @UserAgent, @CreatedBy, @CreatedTime)
                            ON DUPLICATE KEY UPDATE
                                RefreshToken = VALUES(RefreshToken),
                                ExpiryDate = VALUES(ExpiryDate),
                                CreatedBy = VALUES(CreatedBy),
                                CreatedTime = VALUES(CreatedTime); ";

                // Use ExecuteAsync to insert a new record or update an existing record
                // The ON DUPLICATE KEY UPDATE clause is specific to MySQL and MariaDB
                // It updates the record if the primary key already exists
                // Otherwise, it inserts a new record
                // This scenario is for when a user logs in from the same device multiple times and still has a valid refresh token

                int rowsAffected = await ExecuteAsync(sql, new
                {
                    PersoId = refreshJwtTokenEntity.Persoid,
                    RefreshToken = refreshJwtTokenEntity.RefreshToken,
                    ExpiryDate = refreshJwtTokenEntity.ExpiryDate,
                    DeviceId = refreshJwtTokenEntity.DeviceId,
                    UserAgent = refreshJwtTokenEntity.UserAgent,
                    CreatedBy = refreshJwtTokenEntity.CreatedBy,
                    CreatedTime = refreshJwtTokenEntity.CreatedTime,
                });
                _logger.LogInformation("Refresh token added successfully for PersoId: {PersoId}", refreshJwtTokenEntity.Persoid);
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding refresh token for PersoId: {PersoId}", refreshJwtTokenEntity.Persoid);
                return false;
            }
        }
        public async Task<IEnumerable<RefreshJwtTokenEntity>> GetRefreshTokensAsync(
            Guid? persoid = null,
            string refreshToken = null,
            string deviceId = null,
            string userAgent = null)
        {
            if (!persoid.HasValue && string.IsNullOrEmpty(refreshToken))
            {
                throw new ArgumentException("At least one parameter must be provided.");
            }

            string sql = "SELECT Persoid, RefreshToken, ExpiryDate, DeviceId, UserAgent, CreatedBy, CreatedTime FROM RefreshTokens WHERE 1=1";
            var parameters = new DynamicParameters();

            if (!string.IsNullOrEmpty(refreshToken))
            {
                sql += " AND RefreshToken = @RefreshToken";
                parameters.Add("RefreshToken", refreshToken);
            }

            if (persoid.HasValue)
            {
                sql += " AND Persoid = @Persoid";
                parameters.Add("Persoid", persoid.Value);
            }

            if (!string.IsNullOrEmpty(deviceId))
            {
                sql += " AND DeviceId = @DeviceId";
                parameters.Add("DeviceId", deviceId);
            }

            if (!string.IsNullOrEmpty(userAgent))
            {
                sql += " AND UserAgent = @UserAgent";
                parameters.Add("UserAgent", userAgent);
            }

            // Use QueryAsync to return all matching records
            return await QueryAsync<RefreshJwtTokenEntity>(sql, parameters);
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

        // This method is used to expire a refresh token
        public async Task<bool> ExpireRefreshTokenAsync(Guid persoid)
        {
            // Use ITimeProvider to calculate a new expiry (e.g., one minute in the past)
            DateTime newExpiry = _timeProvider.UtcNow.AddMinutes(-1);
            _logger.LogInformation("Expiring refresh token for Persoid {PersoId} with new expiry {NewExpiry}", persoid, newExpiry);
            return await UpdateRefreshTokenExpiryAsync(persoid, newExpiry);
        }

        public async Task<bool> DeleteTokenAsync(string refreshToken)
        {
            const string sql = "DELETE FROM RefreshTokens WHERE RefreshToken = @RefreshToken";
            var rowsAffected = await ExecuteAsync(sql, new { RefreshToken = refreshToken });
            return rowsAffected > 0;
        }
        public async Task<bool> DeleteTokensByUserIdAsync(string userId)
        {
            const string sql = "DELETE FROM RefreshTokens WHERE PersoId = @PersoId";
            var rowsAffected = await ExecuteAsync(sql, new { PersoId = userId });
            return rowsAffected > 0;
        }
    }
    
}


