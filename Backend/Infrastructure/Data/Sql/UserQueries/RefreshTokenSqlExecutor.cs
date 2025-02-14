// Purpose: Implementation of IRefreshTokenSqlExecutor interface for handling refresh token related queries in the database.
// Token in this context refers to a JWT token used for authentication.
// The RefreshJwtTokenEntity class is used to represent a refresh token in the database.

using Backend.Common.Interfaces;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Entities;
using Dapper;
using System.Data.Common;

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
                                (PersoId, SessionId, RefreshToken, AccessTokenJti, RefreshTokenExpiryDate, AccessTokenExpiryDate, DeviceId, UserAgent, CreatedBy, CreatedTime) 
                            VALUES 
                                (@PersoId, @SessionId, @RefreshToken, @AccessTokenJti, @RefreshTokenExpiryDate, @AccessTokenExpiryDate, @DeviceId, @UserAgent, @CreatedBy, @CreatedTime)";
                
                int rowsAffected = await ExecuteAsync(sql, new
                {
                    PersoId = refreshJwtTokenEntity.Persoid,
                    SessionId = refreshJwtTokenEntity.SessionId,
                    RefreshToken = refreshJwtTokenEntity.RefreshToken,
                    AccessTokenJti = refreshJwtTokenEntity.AccessTokenJti,
                    RefreshTokenExpiryDate = refreshJwtTokenEntity.RefreshTokenExpiryDate,
                    AccessTokenExpiryDate = refreshJwtTokenEntity.AccessTokenExpiryDate,
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
            string sessionId = null
            )
        {
            if (!persoid.HasValue && string.IsNullOrEmpty(refreshToken))
            {
                throw new ArgumentException("At least one parameter must be provided.");
            }

            string sql = "SELECT Persoid, CAST(SessionId AS CHAR(36)) AS SessionId, RefreshToken, AccessTokenJti, RefreshTokenExpiryDate, AccessTokenExpiryDate, DeviceId, UserAgent, CreatedBy, CreatedTime FROM RefreshTokens WHERE 1=1";
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

            if (!string.IsNullOrEmpty(sessionId))
            {
                sql += " AND SessionId = @SessionId";
                parameters.Add("SessionId", sessionId);
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
            string sql = "UPDATE RefreshTokens SET RefreshTokenExpiryDate = @NewExpiry WHERE PersoId = @PersoId";
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
        public async Task<BlacklistedTokenEntity?> GetBlacklistedTokenByJtiAsync(string? jti)
        {
            if (string.IsNullOrEmpty(jti))
            {
                throw new ArgumentException("JTI must be provided.", nameof(jti));
            }

            string sqlQuery = "SELECT Id, Jti, ExpiryDate, CreatedAt FROM BlacklistedTokens WHERE Jti = @Jti";
            var parameters = new DynamicParameters();
            parameters.Add("Jti", jti);

            var token = await QueryFirstOrDefaultAsync<BlacklistedTokenEntity>(sqlQuery, parameters);
            if (token == null)
            {
                _logger.LogWarning("No blacklisted token found for JTI: {Jti}", jti);
            }
            return token;
        }
        public async Task<IEnumerable<RefreshJwtTokenEntity>> GetExpiredTokensAsync()
        {
            string sql = @"
            SELECT Persoid, CAST(SessionId AS CHAR(36)) AS SessionId, RefreshToken, AccessTokenJti,
                   RefreshTokenExpiryDate, AccessTokenExpiryDate, DeviceId, UserAgent, CreatedBy, CreatedTime 
            FROM RefreshTokens 
            WHERE RefreshTokenExpiryDate < @Now";

            var parameters = new DynamicParameters(); 
            parameters.Add("Now", DateTime.UtcNow);

            return await QueryAsync<RefreshJwtTokenEntity>(sql, parameters);
        }
    }
}


