using Backend.Domain.Entities.Auth;
using Backend.Domain.Entities.User;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using System.Data.Common;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries;

namespace Backend.Infrastructure.Data.Sql.Queries.UserQueries
{
    public class VerificationTokenSqlExecutor : SqlBase, IVerificationTokenSqlExecutor
    {
        public VerificationTokenSqlExecutor(IConnectionFactory connectionFactory, ILogger<VerificationTokenSqlExecutor> logger)
        : base(connectionFactory, logger)
        {
        }
        public async Task<UserTokenModel> GenerateUserTokenAsync(Guid persoId)
        {
            return new UserTokenModel
            {
                PersoId = persoId,
                Token = Guid.NewGuid(),
                TokenExpiryDate = DateTime.UtcNow.AddHours(24)
            };
        }
        public async Task<bool> InsertUserTokenAsync(UserTokenModel tokenModel, DbConnection? conn = null, DbTransaction? tx = null)
        {
            try
            {
                string insertTokenQuery = @"INSERT INTO VerificationToken (PersoId, Token, TokenExpiryDate)
                                      VALUES (@PersoId, @Token, @TokenExpiryDate)";
                int rowsAffected;

                if (conn != null)
                {
                    // Use the provided connection and transaction.
                    rowsAffected = await ExecuteAsync(conn, insertTokenQuery, new
                    {
                        tokenModel.PersoId,
                        tokenModel.Token,
                        tokenModel.TokenExpiryDate
                    }, tx);
                }
                else
                {
                    // No connection provided—open a new connection.
                    using var localConn = await GetOpenConnectionAsync();
                    rowsAffected = await ExecuteAsync(localConn, insertTokenQuery, new
                    {
                        tokenModel.PersoId,
                        tokenModel.Token,
                        tokenModel.TokenExpiryDate
                    });
                }

                if (rowsAffected > 0)
                {
                    return true;
                }
                else
                {
                    _logger.LogWarning("Token generation query did not affect any rows. PersoId: {PersoId}", tokenModel.PersoId);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while generating user token for PersoId: {PersoId}", tokenModel.PersoId);
                return false;
            }
        }
        public async Task<UserTokenModel?> GetUserVerificationTokenByPersoIdAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE PersoId = @PersoId";
            UserTokenModel? result;

            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                result = await QueryFirstOrDefaultAsync<UserTokenModel>(conn, sqlQuery, new { PersoId = persoid }, tx);
            }
            else
            {
                // No connection provided—open a new one.
                using var localConn = await GetOpenConnectionAsync();
                result = await QueryFirstOrDefaultAsync<UserTokenModel>(localConn, sqlQuery, new { PersoId = persoid });
            }

            if (result == null)
            {
                return null;
            }

            return new UserTokenModel
            {
                PersoId = result.PersoId,
                Token = result.Token,
                TokenExpiryDate = result.TokenExpiryDate
            };
        }

        public async Task<UserTokenModel?> GetUserVerificationTokenByTokenAsync(Guid token, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE Token = @Token";
            UserTokenModel? result;

            if (conn != null)
            {
                // Use the provided connection (and transaction, if any)
                result = await QueryFirstOrDefaultAsync<UserTokenModel>(conn, sqlQuery, new { Token = token }, tx);
            }
            else
            {
                // No connection provided—open a new one
                using var localConn = await GetOpenConnectionAsync();
                result = await QueryFirstOrDefaultAsync<UserTokenModel>(localConn, sqlQuery, new { Token = token });
            }

            if (result == null)
            {
                _logger.LogWarning("No verification token found for Token: {Token}", token);
                return null;
            }

            return new UserTokenModel
            {
                PersoId = result.PersoId,
                Token = result.Token,
                TokenExpiryDate = result.TokenExpiryDate
            };
        }
        public async Task<UserVerificationTrackingModel?> GetUserVerificationTrackingAsync(
            Guid persoId,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            string sql = "SELECT * FROM UserVerificationTracking WHERE PersoId = @PersoId";
            UserVerificationTrackingModel? result;

            if (conn != null)
            {
                // Use the provided connection (and transaction, if any)
                result = await QueryFirstOrDefaultAsync<UserVerificationTrackingModel>(conn, sql, new { PersoId = persoId }, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                result = await QueryFirstOrDefaultAsync<UserVerificationTrackingModel>(localConn, sql, new { PersoId = persoId });
            }

            return result;
        }
        public async Task InsertUserVerificationTrackingAsync(
            UserVerificationTrackingModel tracking,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            string sql = "INSERT INTO UserVerificationTracking (PersoId, LastResendRequestTime, DailyResendCount, LastResendRequestDate, CreatedAt, UpdatedAt) " +
                         "VALUES (@PersoId, @LastResendRequestTime, @DailyResendCount, @LastResendRequestDate, @CreatedAt, @UpdatedAt)";

            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                await ExecuteAsync(conn, sql, tracking, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                await ExecuteAsync(localConn, sql, tracking);
            }
        }
        public async Task UpdateUserVerificationTrackingAsync(
            UserVerificationTrackingModel tracking,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            string sql = "UPDATE UserVerificationTracking SET LastResendRequestTime = @LastResendRequestTime, DailyResendCount = @DailyResendCount, " +
                         "LastResendRequestDate = @LastResendRequestDate, UpdatedAt = @UpdatedAt WHERE PersoId = @PersoId";

            if (conn != null)
            {
                // Use the provided connection (and transaction, if available)
                await ExecuteAsync(conn, sql, tracking, tx);
            }
            else
            {
                // No connection provided—open a new one.
                using var localConn = await GetOpenConnectionAsync();
                await ExecuteAsync(localConn, sql, tracking);
            }
        }
        public async Task<int> DeleteUserTokenByPersoidAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = "DELETE FROM VerificationToken WHERE PersoId = @PersoId";
            int rowsAffected;

            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                rowsAffected = await ExecuteAsync(conn, sqlQuery, new { PersoId = persoid }, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                rowsAffected = await ExecuteAsync(localConn, sqlQuery, new { PersoId = persoid });
            }

            return rowsAffected;
        }
        public async Task SaveResetTokenAsync(Guid persoId, Guid token, DbConnection? conn = null, DbTransaction? tx = null)
        {
            if (conn != null)
            {
                // Use the provided connection and transaction.
                await ExecuteAsync(conn, "DELETE FROM PasswordResetTokens WHERE PersoId = @PersoId", new { PersoId = persoId }, tx);
                await ExecuteAsync(conn, @"
            INSERT INTO PasswordResetTokens (PersoId, Token, Expiry)
            VALUES (@PersoId, @Token, @Expiry)",
                    new
                    {
                        PersoId = persoId,
                        Token = token,
                        Expiry = DateTime.UtcNow.AddHours(1)
                    }, tx);
            }
            else
            {
                // No connection provided—open one connection and reuse it for both operations.
                using var localConn = await GetOpenConnectionAsync();
                await ExecuteAsync(localConn, "DELETE FROM PasswordResetTokens WHERE PersoId = @PersoId", new { PersoId = persoId });
                await ExecuteAsync(localConn, @"
            INSERT INTO PasswordResetTokens (PersoId, Token, Expiry)
            VALUES (@PersoId, @Token, @Expiry)",
                    new
                    {
                        PersoId = persoId,
                        Token = token,
                        Expiry = DateTime.UtcNow.AddHours(1)
                    });
            }
        }
        public async Task<bool> ValidateResetTokenAsync(Guid token, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = @"
        SELECT COUNT(*) 
        FROM PasswordResetTokens 
        WHERE Token = @Token AND Expiry > @CurrentTime";

            _logger.LogInformation("SQL Query: {Query}, Token: {Token}, CurrentTime: {CurrentTime}",
                sqlQuery, token, DateTime.UtcNow);

            int count;

            if (conn != null)
            {
                // Use the provided connection (and transaction if available)
                count = await ExecuteScalarAsync<int>(conn, sqlQuery, new { Token = token, CurrentTime = DateTime.UtcNow }, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                count = await ExecuteScalarAsync<int>(localConn, sqlQuery, new { Token = token, CurrentTime = DateTime.UtcNow });
            }

            return count > 0;
        }
        public async Task<UserModel?> GetUserFromResetTokenAsync(
            Guid token,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            string sqlQuery = @"
        SELECT u.PersoId, u.Email, u.Password 
        FROM PasswordResetTokens t
        INNER JOIN User u ON u.PersoId = t.PersoId
        WHERE t.Token = @Token AND t.Expiry > @CurrentTime";

            _logger.LogInformation("SQL Query: {Query}, Token: {Token}, CurrentTime: {CurrentTime}",
                sqlQuery, token, DateTime.UtcNow);

            UserModel? user;

            if (conn != null)
            {
                // Use the provided connection and transaction if available.
                user = await QueryFirstOrDefaultAsync<UserModel>(conn, sqlQuery, new { Token = token, CurrentTime = DateTime.UtcNow }, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                user = await QueryFirstOrDefaultAsync<UserModel>(localConn, sqlQuery, new { Token = token, CurrentTime = DateTime.UtcNow });
            }

            if (user == null)
            {
                _logger.LogWarning("No user found for token: {Token}", token);
            }

            return user;
        }
        public async Task<IEnumerable<UserTokenModel>> GetResetTokensByPersoIdAsync(
            Guid persoId,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            string sqlQuery = "SELECT PersoId, Token, Expiry FROM PasswordResetTokens WHERE PersoId = @PersoId";

            if (conn != null)
            {
                // Use the provided connection (and transaction, if any)
                return await QueryAsync<UserTokenModel>(conn, sqlQuery, new { PersoId = persoId }, tx);
            }
            else
            {
                // No connection provided—open a new one.
                using var localConn = await GetOpenConnectionAsync();
                return await QueryAsync<UserTokenModel>(localConn, sqlQuery, new { PersoId = persoId });
            }
        }
    }
}
