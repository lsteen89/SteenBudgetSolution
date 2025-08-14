// Purpose: Implementation of IRefreshTokenSqlExecutor interface for handling refresh token related queries in the database.
// Token in this context refers to a JWT token used for authentication.
// The RefreshJwtTokenEntity class is used to represent a refresh token in the database.

using Backend.Common.Interfaces;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries;
using Backend.Infrastructure.Entities.Tokens;
using Dapper;
using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Data.Common;
using System.Text;
using System.Text.Json;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Domain.Filters;

namespace Backend.Infrastructure.Data.Sql.Queries.UserQueries
{
    [Obsolete("Use the new RefreshTokenSqlExecutor instead. This will be removed in a future version.")]
    public class RefreshTokenSqlExecutor : SqlBase, IRefreshTokenSqlExecutor
    {
        private readonly ITimeProvider _timeProvider;
        private readonly IDistributedCache _cache;
        public RefreshTokenSqlExecutor(
            IUnitOfWork unitOfWork,
            ILogger<RefreshTokenSqlExecutor> logger,
            ITimeProvider timeProvider,
            IDistributedCache cache)
            : base(unitOfWork, logger)
        {
            _cache = cache;
            _timeProvider = timeProvider;
        }

        #region Retrieval/insertion
        // Purpose: Adds a new refresh token to the database.
        // This method uses an upsert operation to either insert a new token or update an existing one.
        // Used in refresh token rotation.
        public async Task<bool> UpsertRefreshTokenAsync(
            RefreshJwtTokenEntity token,
            CancellationToken ct = default)
        {
            const string sql = @"
            INSERT INTO RefreshTokens
            (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti,
            ExpiresRollingUtc, ExpiresAbsoluteUtc, RevokedUtc, Status, IsPersistent,
            DeviceId, UserAgent, CreatedUtc)
            VALUES
            (@TokenId, @Persoid, @SessionId, @HashedToken, @AccessTokenJti,
            @ExpiresRollingUtc, @ExpiresAbsoluteUtc, @RevokedUtc, @Status, @IsPersistent,
            @DeviceId, @UserAgent, @CreatedUtc)
            ON DUPLICATE KEY UPDATE
            HashedToken        = VALUES(HashedToken),
            AccessTokenJti     = VALUES(AccessTokenJti),
            ExpiresRollingUtc  = VALUES(ExpiresRollingUtc),
            ExpiresAbsoluteUtc = VALUES(ExpiresAbsoluteUtc),
            RevokedUtc         = VALUES(RevokedUtc),
            DeviceId           = VALUES(DeviceId),
            UserAgent          = VALUES(UserAgent),
            Status             = 1;   -- stay Active after rotation
            ";

            _logger.LogInformation("Upserting refresh token for PersoId {PersoId}", token.Persoid);
            _logger.LogInformation("SessionId after upsert: {SessionId}", token.SessionId);
            var rows = await ExecuteAsync(sql, new
            {
                token.TokenId,
                Persoid = token.Persoid,
                token.SessionId,
                HashedToken = token.HashedToken,
                AccessTokenJti = token.AccessTokenJti,
                ExpiresRollingUtc = token.ExpiresRollingUtc,
                ExpiresAbsoluteUtc = token.ExpiresAbsoluteUtc,
                RevokedUtc = token.RevokedUtc,
                Status = token.Status,
                IsPersistent = token.IsPersistent,
                token.DeviceId,
                token.UserAgent,
                CreatedUtc = token.CreatedUtc
            }, ct);
            _logger.LogInformation("Upsert completed for PersoId {PersoId}", token.Persoid);
            return rows > 0;
        }

        public Task<RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct)
            => QueryFirstOrDefaultAsync<RefreshJwtTokenEntity>($@"
            SELECT TokenId, Persoid, SessionId, HashedToken, AccessTokenJti,
                    DeviceId, UserAgent,
                    ExpiresRollingUtc, ExpiresAbsoluteUtc,
                    Status, IsPersistent,
                    CreatedUtc, RevokedUtc
            FROM RefreshTokens
            WHERE SessionId = @SessionId
                AND HashedToken = @Hash
                AND RevokedUtc IS NULL
                AND ExpiresAbsoluteUtc >= @Now
                AND ExpiresRollingUtc  >= @Now
            FOR UPDATE
            LIMIT 1;",
            new { SessionId = sessionId, Hash = cookieHash, Now = nowUtc }, ct);

        public async Task<IReadOnlyList<RefreshJwtTokenEntity>> SearchAsync(RefreshTokenFilter filter, DateTime nowUtc, bool onlyActive, bool forUpdate, CancellationToken ct)
        {
            var sql = new StringBuilder(@"
            SELECT TokenId, Persoid, SessionId, HashedToken, AccessTokenJti,
                    DeviceId, UserAgent,
                    ExpiresRollingUtc, ExpiresAbsoluteUtc,
                    Status, IsPersistent,
                    CreatedUtc, RevokedUtc
            WHERE 1=1");

            var p = new DynamicParameters();

            if (!string.IsNullOrWhiteSpace(filter.HashedToken))
            { sql.Append(" AND HashedToken = @Hash"); p.Add("Hash", filter.HashedToken); }

            if (filter.PersoId is Guid pid)
            { sql.Append(" AND PersoId = @PersoId"); p.Add("PersoId", pid); }

            if (filter.SessionId is Guid sid)
            { sql.Append(" AND SessionId = @SessionId"); p.Add("SessionId", sid); }

            if (onlyActive)
            {
                sql.Append(" AND RevokedAtUtc IS NULL");
                sql.Append(" AND ExpiresAbsoluteUtc >= @Now");
                sql.Append(" AND ExpiresRollingUtc  >= @Now");
                p.Add("Now", nowUtc);
            }

            if (forUpdate) sql.Append(" FOR UPDATE");

            var rows = await QueryAsync<RefreshJwtTokenEntity>(sql.ToString(), p, ct);
            return rows;
        }

        #endregion

        #region BlackList
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
        public async Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration, CancellationToken ct)
        {
            try
            {
                _logger.LogInformation("Adding blacklisted token for Jti: {Jti}", jti);
                string sql = @"
                INSERT INTO BlacklistedTokens (Jti, ExpiryDate)
                VALUES (@Jti, @ExpiryDate)
                ON DUPLICATE KEY UPDATE
                ExpiryDate = GREATEST(ExpiryDate, VALUES(ExpiryDate));";
                int rowsAffected = await ExecuteAsync(sql, new { Jti = jti, ExpiryDate = expiration }, ct);
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
        #endregion

        #region Expire/revoke tokens
        // NOTE:
        // THESE THREE METHODS ARE FOR UPDATING THE STATUS OF TOKENS
        // THEY ARE ONLY USED IN TESTS AND NOT IN PRODUCTION CODE
        // THEY WILL BE REFACTORED OUT IN THE FUTURE
        // TODO: Refactor these methods to be more generic and reusable
        /*─────────────────────────────────────────────────────────────────*/
        /*  1)  Extend rolling-window expiry                              */
        /*─────────────────────────────────────────────────────────────────*/
        public async Task<bool> UpdateRollingExpiryAsync(
            Guid persoid,
            Guid sessionId,
            DateTime newExpiryUtc,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            const string sql = @"
            UPDATE RefreshTokens
               SET ExpiresRollingUtc = @NewExpiryUtc
             WHERE Persoid           = @Persoid
               AND SessionId         = @SessionId
               AND Status            = @ActiveStatus";

            return await ExecAsync(
                sql,
                new
                {
                    Persoid = persoid,
                    SessionId = sessionId,
                    NewExpiryUtc = newExpiryUtc,
                    ActiveStatus = (int)TokenStatus.Active
                },
                conn,
                tx);
        }

        /*───────────────────────────────────────────────────────────────*/
        /* 2) Hard-set ABSOLUTE expiry (or revoke instantly by default)  */
        /* We also archive the revoked token for auditing purposes.      */
        /*───────────────────────────────────────────────────────────────*/
        public async Task<bool> UpdateAbsoluteExpiryAsync(
            Guid persoid,
            Guid sessionId,
            DbConnection conn,
            DbTransaction tx,
            DateTime? whenUtc = null)
        {
            DateTime expiry = whenUtc ?? _timeProvider.UtcNow.AddMinutes(-1);
            #region expire
            // 1. UPDATE + FOR UPDATE locks the row we’re about to move
            const string markSql = @"
            UPDATE RefreshTokens
               SET ExpiresAbsoluteUtc = @NewExpiryUtc,
                   Status             = @RevokedStatus,   -- 2 = Revoked
                   RevokedUtc         = @NowUtc
             WHERE Persoid            = @Persoid
               AND SessionId          = @SessionId
               AND Status             = @ActiveStatus
             LIMIT 1";

            var p = new
            {
                Persoid = persoid,
                SessionId = sessionId,
                NewExpiryUtc = expiry,
                NowUtc = _timeProvider.UtcNow,
                RevokedStatus = (int)TokenStatus.Revoked,
                ActiveStatus = (int)TokenStatus.Active
            };

            int updated = await conn.ExecuteAsync(markSql, p, tx);
            if (updated == 0) return false;        // nothing to revoke
            #endregion
            #region archive
            /* 2. Copy the (now-revoked) row into the archive */
            const string copySql = @"
            INSERT INTO RefreshTokens_Archive
               (TokenId,
                Persoid,
                SessionId,
                HashedToken,
                AccessTokenJti,
                ExpiresRollingUtc,
                ExpiresAbsoluteUtc,
                RevokedUtc,
                Status,
                DeviceId,
                UserAgent,
                CreatedUtc
               )
            SELECT
                TokenId,
                Persoid,
                SessionId,
                HashedToken,
                AccessTokenJti,
                ExpiresRollingUtc,
                ExpiresAbsoluteUtc,
                RevokedUtc,
                Status,
                DeviceId,
                UserAgent,
                CreatedUtc
              FROM RefreshTokens
             WHERE Persoid   = @Persoid
               AND SessionId = @SessionId
               AND Status    = @RevokedStatus
             LIMIT 1;
            ";
            await conn.ExecuteAsync(copySql, new
            {
                Persoid = p.Persoid,
                SessionId = p.SessionId,
                RevokedStatus = p.RevokedStatus,
                DeletedUtc = p.NowUtc
            }, tx);

            /* 3. Purge it from the hot table */
            const string deleteSql = @"
            DELETE FROM RefreshTokens
             WHERE Persoid   = @Persoid
               AND SessionId = @SessionId
               AND Status    = @RevokedStatus
             LIMIT 1";
            await conn.ExecuteAsync(deleteSql, new { p.Persoid, p.SessionId, p.RevokedStatus }, tx);
            #endregion
            return true;                           // we rotated successfully
        }

        /*─────────────────────────────────────────────────────────────────*/
        /*  3)  Revoke token completely (Status = Revoked, timestamp set) */
        /*─────────────────────────────────────────────────────────────────*/
        public async Task<bool> RevokeRefreshTokenAsync(
            Guid persoid,
            Guid sessionId,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            const string sql = @"
            UPDATE RefreshTokens
               SET Status     = @RevokedStatus,
                   RevokedUtc = @NowUtc
             WHERE Persoid    = @Persoid
               AND SessionId  = @SessionId
               AND Status     = @ActiveStatus";

            var paramBag = new
            {
                Persoid = persoid,
                SessionId = sessionId,
                NowUtc = _timeProvider.UtcNow,
                RevokedStatus = (int)TokenStatus.Revoked,
                ActiveStatus = (int)TokenStatus.Active
            };

            return await ExecAsync(sql, paramBag, conn, tx);
        }


        private async Task<bool> ExecAsync(
            string sql,
            object paramBag,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            if (conn != null)
            {
                int rows = await ExecuteAsync(conn, sql, paramBag, tx);
                return rows > 0;
            }

            await using var local = await GetOpenConnectionAsync();
            int affected = await ExecuteAsync(local, sql, paramBag);
            return affected > 0;
        }

        #endregion

        #region Delete/retrieve/update tokens
        public async Task<bool> DeleteTokenAsync(string refreshToken, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string sql = "DELETE FROM RefreshTokens WHERE HashedToken = @RefreshToken";
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
            if (rowsAffected == 0)
            {
                _logger.LogWarning("No token found for deletion with the provided refresh token.");
            }
            else
            {
                _logger.LogInformation("Token deleted successfully for refresh token: {RefreshToken}", refreshToken);
            }

            return rowsAffected > 0;
        }
        public async Task<bool> DeleteTokensByUserIdAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string sql = "DELETE FROM RefreshTokens WHERE PersoId = @persoid";
            int rowsAffected;

            if (tx != null)
            {
                if (conn == null)
                    throw new ArgumentNullException(nameof(conn), "A connection must be provided when a transaction is provided.");
                rowsAffected = await ExecuteAsync(conn, sql, new { Persoid = persoid }, tx);
            }
            else
            {
                using var localConn = await GetOpenConnectionAsync();
                rowsAffected = await ExecuteAsync(localConn, sql, new { Persoid = persoid });
            }

            return rowsAffected > 0;
        }
        public async Task<IEnumerable<RefreshJwtTokenEntity>> GetExpiredTokensAsync(
            DbConnection? conn = null, DbTransaction? tx = null, int batchSize = 1000)
        {
            try
            {
                var now = DateTime.UtcNow;

                // Query the database for expired tokens
                string sql = """
                SELECT  PersoId,
                        SessionId,
                        HashedToken,
                        AccessTokenJti,
                        ExpiresRollingUtc,
                        ExpiresAbsoluteUtc,
                        DeviceId,
                        UserAgent
                FROM    RefreshTokens
                WHERE   ExpiresRollingUtc < @Now
                    OR   ExpiresAbsoluteUtc < @Now
                ORDER BY ExpiresRollingUtc ASC          -- earliest expiries first
                LIMIT @BatchSize;
                """;

                var p = new DynamicParameters();
                p.Add("Now", now);
                p.Add("BatchSize", batchSize);

                if (conn is null)
                {
                    await using var local = await GetOpenConnectionAsync();
                    return await QueryAsync<RefreshJwtTokenEntity>(local, sql, p);
                }

                return await QueryAsync<RefreshJwtTokenEntity>(conn, sql, p, tx);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying expired tokens.");
                throw;
            }
        }

        public Task<int> RevokeSessionAsync(Guid persoid, Guid sessionId, DateTime nowUtc, CancellationToken ct)
            => ExecuteAsync(@"UPDATE RefreshTokens
                            SET Status = 2, RevokedUtc = @Now
                            WHERE Persoid = @Perso AND SessionId = @Sess AND Status = 1;",
                            new { Perso = persoid, Sess = sessionId, Now = nowUtc }, ct);
        public Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct)
            => ExecuteAsync(@"UPDATE RefreshTokens
                            SET Status = 2, RevokedUtc = @Now
                            WHERE Persoid = @Perso AND Status = 1;",
                            new { Perso = persoid, Now = nowUtc }, ct);

        #endregion
        #region Archive
        public async Task<IReadOnlyList<RefreshJwtTokenArchiveEntity>> GetArchivedTokensAsync(
            Guid persoId,
            Guid sessionId,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            const string sql = @"
            SELECT
                TokenId,
                Persoid,
                SessionId,
                HashedToken,
                AccessTokenJti,
                ExpiresRollingUtc,
                ExpiresAbsoluteUtc,
                RevokedUtc,
                Status,
                DeviceId,
                UserAgent,
                CreatedUtc
            FROM RefreshTokens_Archive
            WHERE Persoid   = @Persoid
              AND SessionId = @SessionId";

            if (conn is null)
            {
                await using var c = await GetOpenConnectionAsync();
                return (await c.QueryAsync<RefreshJwtTokenArchiveEntity>(sql, new { Persoid = persoId, SessionId = sessionId }))
                       .ToList();
            }
            return (await conn.QueryAsync<RefreshJwtTokenArchiveEntity>(sql, new { Persoid = persoId, SessionId = sessionId }, tx))
                   .ToList();
        }

        public async Task<int> CountRefreshTokensAsync(
            Guid persoId,
            Guid? sessionId = null,
            bool onlyActive = true,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            var where = new StringBuilder("WHERE Persoid = @Persoid");
            if (sessionId.HasValue)
                where.Append(" AND SessionId = @SessionId");
            if (onlyActive)
                where.Append(" AND Status = @ActiveStatus");

            var sql = $@"SELECT COUNT(*) FROM RefreshTokens {where}";
            var parameters = new DynamicParameters();
            parameters.Add("Persoid", persoId);
            if (sessionId.HasValue) parameters.Add("SessionId", sessionId.Value);
            if (onlyActive) parameters.Add("ActiveStatus", (int)TokenStatus.Active);

            if (conn is null)
            {
                await using var c = await GetOpenConnectionAsync();
                return await c.ExecuteScalarAsync<int>(sql, parameters);
            }
            return await conn.ExecuteScalarAsync<int>(sql, parameters, tx);
        }
        #endregion
    }
}


