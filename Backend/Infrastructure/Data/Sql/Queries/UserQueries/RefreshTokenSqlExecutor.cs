// Purpose: Implementation of IRefreshTokenSqlExecutor interface for handling refresh token related queries in the database.
// Token in this context refers to a JWT token used for authentication.
// The RefreshJwtTokenEntity class is used to represent a refresh token in the database.

using Backend.Common.Interfaces;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.UserQueries;
using Backend.Infrastructure.Entities.Tokens;
using Dapper;
using Microsoft.Extensions.Caching.Distributed;
using System.Data.Common;
using System.Text.Json;

namespace Backend.Infrastructure.Data.Sql.Queries.UserQueries
{
    public class RefreshTokenSqlExecutor : SqlBase, IRefreshTokenSqlExecutor
    {
        private readonly ITimeProvider _timeProvider;
        private readonly IDistributedCache _cache;
        public RefreshTokenSqlExecutor(IConnectionFactory connectionFactory, ILogger<RefreshTokenSqlExecutor> logger, ITimeProvider timeProvider, IDistributedCache cache)
            : base(connectionFactory, logger)
        {
            _cache = cache;
            _timeProvider = timeProvider;
        }
        public async Task<bool> AddRefreshTokenAsync(RefreshJwtTokenEntity refreshJwtTokenEntity, DbConnection? conn = null, DbTransaction? tx = null)
        {
            try
            {
                _logger.LogInformation("Adding refresh token for PersoId: {PersoId}", refreshJwtTokenEntity.Persoid);
                string sql = @"INSERT INTO RefreshTokens 
                       (PersoId, SessionId, RefreshToken, AccessTokenJti, RefreshTokenExpiryDate, AccessTokenExpiryDate, DeviceId, UserAgent, CreatedBy, CreatedTime) 
                       VALUES 
                       (@PersoId, @SessionId, @RefreshToken, @AccessTokenJti, @RefreshTokenExpiryDate, @AccessTokenExpiryDate, @DeviceId, @UserAgent, @CreatedBy, @CreatedTime)";

                int rowsAffected;

                if (conn != null)
                {
                    // Use provided connection and transaction.
                    rowsAffected = await ExecuteAsync(conn, sql, new
                    {
                        PersoId = refreshJwtTokenEntity.Persoid,
                        refreshJwtTokenEntity.SessionId,
                        refreshJwtTokenEntity.RefreshToken,
                        refreshJwtTokenEntity.AccessTokenJti,
                        refreshJwtTokenEntity.RefreshTokenExpiryDate,
                        refreshJwtTokenEntity.AccessTokenExpiryDate,
                        refreshJwtTokenEntity.DeviceId,
                        refreshJwtTokenEntity.UserAgent,
                        refreshJwtTokenEntity.CreatedBy,
                        refreshJwtTokenEntity.CreatedTime,
                    }, tx);
                }
                else
                {
                    // No connection provided—open a new connection and wrap in a transaction.
                    using var localConn = await GetOpenConnectionAsync();
                    using var localTx = localConn.BeginTransaction();
                    try
                    {
                        rowsAffected = await ExecuteAsync(localConn, sql, new
                        {
                            PersoId = refreshJwtTokenEntity.Persoid,
                            refreshJwtTokenEntity.SessionId,
                            refreshJwtTokenEntity.RefreshToken,
                            refreshJwtTokenEntity.AccessTokenJti,
                            refreshJwtTokenEntity.RefreshTokenExpiryDate,
                            refreshJwtTokenEntity.AccessTokenExpiryDate,
                            refreshJwtTokenEntity.DeviceId,
                            refreshJwtTokenEntity.UserAgent,
                            refreshJwtTokenEntity.CreatedBy,
                            refreshJwtTokenEntity.CreatedTime,
                        }, localTx);

                        localTx.Commit();
                    }
                    catch
                    {
                        localTx.Rollback();
                        throw;
                    }
                }

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
            string sessionId = null,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            if (!persoid.HasValue && string.IsNullOrEmpty(refreshToken))
            {
                throw new ArgumentException("At least one parameter must be provided.");
            }

            string sql = @"SELECT Persoid, CAST(SessionId AS CHAR(36)) AS SessionId, RefreshToken, AccessTokenJti, 
                          RefreshTokenExpiryDate, AccessTokenExpiryDate, DeviceId, UserAgent, CreatedBy, CreatedTime 
                   FROM RefreshTokens 
                   WHERE 1=1";
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

            // Add row-level locking if within a transaction.
            if (tx != null)
            {
                sql += " FOR UPDATE";
                // Use the connection associated with the provided transaction.
                return await QueryAsync<RefreshJwtTokenEntity>(conn, sql, parameters, tx);
            }
            else
            {
                // No transaction provided—open a new connection.
                using var newConn = await GetOpenConnectionAsync();
                return await QueryAsync<RefreshJwtTokenEntity>(newConn, sql, parameters);
            }
        }

        public async Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, DbConnection? conn = null, DbTransaction? tx = null)
        {
            var now = DateTime.UtcNow;
            if (string.IsNullOrEmpty(accessTokenJti))
                throw new ArgumentException("Access token JTI cannot be null or empty.", nameof(accessTokenJti));

            string sql = "SELECT COUNT(1) FROM RefreshTokens WHERE AccessTokenJti = @AccessTokenJti AND RefreshTokenExpiryDate > @Now";
            var parameters = new DynamicParameters();
            parameters.Add("AccessTokenJti", accessTokenJti);
            parameters.Add("Now", now);

            if (tx != null)
            {
                // Use the connection associated with the provided transaction.
                var count = await ExecuteScalarAsync<int>(conn, sql, parameters, tx);
                return count > 0;
            }
            else
            {
                using var newConn = await GetOpenConnectionAsync();
                int count = await ExecuteScalarAsync<int>(newConn, sql, parameters);
                return count > 0;
            }
        }
        public async Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration, DbConnection? conn = null, DbTransaction? tx = null)
        {
            try
            {
                _logger.LogInformation("Adding blacklisted token for Jti: {Jti}", jti);
                string sql = "INSERT INTO BlacklistedTokens (Jti, ExpiryDate) VALUES (@Jti, @ExpiryDate)";
                int rowsAffected;

                if (conn != null)
                {
                    // Use provided connection and transaction.
                    rowsAffected = await ExecuteAsync(conn, sql, new { Jti = jti, ExpiryDate = expiration }, tx);
                }
                else
                {
                    // No connection provided—open a new one.
                    using var localConn = await GetOpenConnectionAsync();
                    rowsAffected = await ExecuteAsync(localConn, sql, new { Jti = jti, ExpiryDate = expiration });
                }

                _logger.LogInformation("Blacklisted token added successfully for Jti: {Jti}", jti);
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while adding blacklisted token for Jti: {Jti}", jti);
                return false;
            }
        }

        public async Task<bool> IsTokenBlacklistedAsync(string jti, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sql = "SELECT COUNT(1) FROM BlacklistedTokens WHERE Jti = @Jti";
            int count;

            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                count = await ExecuteScalarAsync<int>(conn, sql, new { Jti = jti }, tx);
            }
            else
            {
                // No connection provided—open a new one.
                using var localConn = await GetOpenConnectionAsync();
                count = await ExecuteScalarAsync<int>(localConn, sql, new { Jti = jti });
            }

            return count > 0;
        }
        private async Task<bool> UpdateRefreshTokenExpiryAsync(Guid persoId, DateTime newExpiry, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sql = "UPDATE RefreshTokens SET RefreshTokenExpiryDate = @NewExpiry WHERE PersoId = @PersoId";
            int rowsAffected;

            if (tx != null)
            {
                if (conn == null)
                {
                    throw new ArgumentNullException(nameof(conn), "A connection must be provided when a transaction is provided.");
                }
                // Use the provided connection and transaction
                rowsAffected = await ExecuteAsync(conn, sql, new { NewExpiry = newExpiry, PersoId = persoId }, tx);
            }
            else
            {
                // No transaction provided—open a new connection locally
                using var localConn = await GetOpenConnectionAsync();
                rowsAffected = await ExecuteAsync(localConn, sql, new { NewExpiry = newExpiry, PersoId = persoId });
            }

            return rowsAffected > 0;
        }

        // This method is used to expire a refresh token
        public async Task<bool> ExpireRefreshTokenAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            DateTime newExpiry = _timeProvider.UtcNow.AddMinutes(-1);
            _logger.LogInformation("Expiring refresh token for PersoId {PersoId} with new expiry {NewExpiry}", persoId, newExpiry);

            // Forward the connection and transaction (if any) to the private method.
            return await UpdateRefreshTokenExpiryAsync(persoId, newExpiry, conn, tx);
        }

        public async Task<bool> DeleteTokenAsync(string refreshToken, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string sql = "DELETE FROM RefreshTokens WHERE RefreshToken = @RefreshToken";
            int rowsAffected;

            if (tx != null)
            {
                // If a transaction is provided, ensure a connection is also provided.
                if (conn == null)
                    throw new ArgumentNullException(nameof(conn), "A connection must be provided when a transaction is provided.");
                rowsAffected = await ExecuteAsync(conn, sql, new { RefreshToken = refreshToken }, tx);
            }
            else
            {
                // No transaction provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                rowsAffected = await ExecuteAsync(localConn, sql, new { RefreshToken = refreshToken });
            }

            return rowsAffected > 0;
        }
        public async Task<bool> DeleteTokensByUserIdAsync(string userId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string sql = "DELETE FROM RefreshTokens WHERE PersoId = @PersoId";
            int rowsAffected;

            if (tx != null)
            {
                if (conn == null)
                    throw new ArgumentNullException(nameof(conn), "A connection must be provided when a transaction is provided.");
                rowsAffected = await ExecuteAsync(conn, sql, new { PersoId = userId }, tx);
            }
            else
            {
                using var localConn = await GetOpenConnectionAsync();
                rowsAffected = await ExecuteAsync(localConn, sql, new { PersoId = userId });
            }

            return rowsAffected > 0;
        }
        public async Task<BlacklistedTokenEntity?> GetBlacklistedTokenByJtiAsync(string? jti, DbConnection? conn = null, DbTransaction? tx = null)
        {
            if (string.IsNullOrEmpty(jti))
            {
                throw new ArgumentException("JTI must be provided.", nameof(jti));
            }

            string sqlQuery = "SELECT Id, Jti, ExpiryDate, CreatedAt FROM BlacklistedTokens WHERE Jti = @Jti";
            var parameters = new DynamicParameters();
            parameters.Add("Jti", jti);

            BlacklistedTokenEntity? token;

            if (conn != null)
            {
                // Use the provided connection and transaction.
                token = await QueryFirstOrDefaultAsync<BlacklistedTokenEntity>(conn, sqlQuery, parameters, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                token = await QueryFirstOrDefaultAsync<BlacklistedTokenEntity>(localConn, sqlQuery, parameters);
            }

            if (token == null)
            {
                _logger.LogWarning("No blacklisted token found for JTI: {Jti}", jti);
            }

            return token;
        }

        public async Task<IEnumerable<RefreshJwtTokenEntity>> GetExpiredTokensAsync(DbConnection? conn = null, DbTransaction? tx = null)
        {
            try
            {
                var now = DateTime.UtcNow;
                // Create a cache key that changes appropriately (e.g., every 30 seconds)
                var roundedNow = new DateTime(now.Ticks - (now.Ticks % (TimeSpan.TicksPerSecond * 30)), now.Kind);
                string cacheKey = $"ExpiredTokens_{roundedNow:yyyyMMddHHmmss}";

                // Try to get cached tokens
                var cachedTokensJson = await _cache.GetStringAsync(cacheKey);
                if (!string.IsNullOrEmpty(cachedTokensJson))
                {
                    var cachedTokens = JsonSerializer.Deserialize<IEnumerable<RefreshJwtTokenEntity>>(cachedTokensJson);
                    if (cachedTokens != null)
                    {
                        return cachedTokens;
                    }
                }

                // Query the database for expired tokens
                string sql = @"
                SELECT Persoid, CAST(SessionId AS CHAR(36)) AS SessionId, RefreshToken, AccessTokenJti,
                       RefreshTokenExpiryDate, AccessTokenExpiryDate, DeviceId, UserAgent, CreatedBy, CreatedTime 
                FROM RefreshTokens 
                WHERE RefreshTokenExpiryDate < @Now";
                var parameters = new DynamicParameters();
                parameters.Add("Now", now);

                IEnumerable<RefreshJwtTokenEntity> tokens;
                if (conn != null)
                {
                    // Use the provided connection and transaction.
                    tokens = await QueryAsync<RefreshJwtTokenEntity>(conn, sql, parameters, tx);
                }
                else
                {
                    // No connection provided—open a new one.
                    using var localConn = await GetOpenConnectionAsync();
                    tokens = await QueryAsync<RefreshJwtTokenEntity>(localConn, sql, parameters);
                }

                // Cache the result for a short duration (e.g., 35 seconds)
                var cacheOptions = new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(35)
                };
                var tokensJson = JsonSerializer.Serialize(tokens);
                await _cache.SetStringAsync(cacheKey, tokensJson, cacheOptions);

                return tokens;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while querying expired tokens.");
                throw;
            }
        }


    }
}


