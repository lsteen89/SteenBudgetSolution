using Backend.Domain.Entities.User;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries;
using Dapper;
using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Queries.UserQueries
{
    public class AuthenticationSqlExecutor : SqlBase, IAuthenticationSqlExecutor
    {
        private readonly ILogger<AuthenticationSqlExecutor> _logger;
        private readonly IUserSqlExecutor _userSqlExecutor;

        public AuthenticationSqlExecutor(IConnectionFactory connectionFactory, ILogger<AuthenticationSqlExecutor> logger, IUserSqlExecutor userSqlExecutor)
            : base(connectionFactory, logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _userSqlExecutor = userSqlExecutor ?? throw new ArgumentNullException(nameof(userSqlExecutor));
        }
        public async Task LockUserAsync(string email, TimeSpan lockoutDuration, DbConnection? conn = null, DbTransaction? tx = null)
        {
            var lockoutUntil = DateTime.UtcNow.Add(lockoutDuration);
            string sqlQuery = @"
                UPDATE User 
                SET LockoutUntil = @LockoutUntil 
                WHERE Email = @Email";

            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                await ExecuteAsync(conn, sqlQuery, new { LockoutUntil = lockoutUntil, Email = email }, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                await ExecuteAsync(localConn, sqlQuery, new { LockoutUntil = lockoutUntil, Email = email });
            }

            _logger.LogInformation("User locked out until {LockoutUntil} for email: {Email}", lockoutUntil, email);
        }
        public async Task UnlockUserAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = @"
                UPDATE User 
                SET LockoutUntil = NULL 
                WHERE PersoId = @PersoId";

            if (conn != null)
            {
                await ExecuteAsync(conn, sqlQuery, new { PersoId = persoId }, tx);
            }
            else
            {
                using var localConn = await GetOpenConnectionAsync();
                await ExecuteAsync(localConn, sqlQuery, new { PersoId = persoId });
            }

            _logger.LogInformation("User unlocked with PersoId: {PersoId}", persoId);
        }

        public async Task RecordFailedLoginAsync(
            string email,
            string ipAdress,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            // Get the user model using the same connection/transaction if provided.
            var user = await _userSqlExecutor.GetUserModelAsync(email: email, conn: conn, tx: tx);
            if (user == null)
            {
                _logger.LogWarning("Failed login attempt for non-existent user with email: {Email}", email);
                return;
            }

            string sqlQuery = @"
        INSERT INTO FailedLoginAttempts (PersoId, IpAddress, AttemptTime)
        VALUES (@PersoId, @IpAddress, @AttemptTime)";

            if (conn != null)
            {
                // Use the provided connection and transaction.
                await ExecuteAsync(conn, sqlQuery, new
                {
                    user.PersoId,
                    IpAddress = ipAdress,
                    AttemptTime = DateTime.UtcNow
                }, tx);
            }
            else
            {
                // No connection provided—open a new one.
                using var localConn = await GetOpenConnectionAsync();
                await ExecuteAsync(localConn, sqlQuery, new
                {
                    user.PersoId,
                    IpAddress = ipAdress,
                    AttemptTime = DateTime.UtcNow
                });
            }

            _logger.LogInformation("Failed login attempt recorded for PersoId: {PersoId}", user.PersoId);
        }
        public async Task<bool> ShouldLockUserAsync(string email, DbConnection? conn = null, DbTransaction? tx = null)
        {
            UserModel? user;

            if (conn != null)
            {
                // Use the provided connection and transaction if available.
                user = await _userSqlExecutor.GetUserModelAsync(email: email, conn: conn, tx: tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                user = await _userSqlExecutor.GetUserModelAsync(email: email, conn: localConn);
            }

            if (user == null)
            {
                return false; // No user, so no lockout.
            }

            int recentFailedAttempts;

            if (conn != null)
            {
                recentFailedAttempts = await GetRecentFailedAttemptsAsync(user.PersoId, conn, tx);
            }
            else
            {
                using var localConn = await GetOpenConnectionAsync();
                recentFailedAttempts = await GetRecentFailedAttemptsAsync(user.PersoId, localConn);
            }

            return recentFailedAttempts >= 5; // Lock the user if failed attempts exceed the threshold.
        }

        public async Task<int> GetRecentFailedAttemptsAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = @"
            SELECT COUNT(*) 
            FROM FailedLoginAttempts 
            WHERE PersoId = @PersoId AND AttemptTime > @CutoffTime";


            var parameters = new
            {
                PersoId = persoId,
                CutoffTime = DateTime.UtcNow.AddMinutes(-15)
            };

            if (conn == null)
            {
                // No connection provided—open one locally.
                using var localConn = await GetOpenConnectionAsync();
                return await localConn.ExecuteScalarAsync<int>(sqlQuery, parameters, tx);
            }
            else
            {
                // Use the provided connection and transaction.
                return await conn.ExecuteScalarAsync<int>(sqlQuery, parameters, tx);
            }
        }
        public async Task ResetFailedLoginAttemptsAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = "DELETE FROM FailedLoginAttempts WHERE PersoId = @PersoId";

            if (conn != null)
            {
                await ExecuteAsync(conn, sqlQuery, new { PersoId = persoId }, tx);
            }
            else
            {
                using var localConn = await GetOpenConnectionAsync();
                await ExecuteAsync(localConn, sqlQuery, new { PersoId = persoId });
            }
        }
        public async Task<bool> UpdatePasswordAsync(Guid persoId, string hashedPassword, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string query = @"
                UPDATE User
                SET Password = @hashedPassword
                WHERE PersoId = @persoId;
            ";

            int rowsAffected;

            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                rowsAffected = await ExecuteAsync(conn, query, new { persoId, hashedPassword }, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                rowsAffected = await ExecuteAsync(localConn, query, new { persoId, hashedPassword });
            }

            return rowsAffected > 0;
        }

    }
}
