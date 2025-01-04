using Backend.Domain.Entities;
using System.Data.Common;
using Dapper;
using Backend.Infrastructure.Data.Sql.Interfaces;

namespace Backend.Infrastructure.Data.Sql.UserQueries
{
    public class AuthenticationSqlExecutor : SqlBase, IAuthenticationSqlExecutor
    {
        private readonly ILogger<AuthenticationSqlExecutor> _logger;
        private readonly IUserSqlExecutor _userSqlExecutor;
        public AuthenticationSqlExecutor(DbConnection connection, ILogger<AuthenticationSqlExecutor> logger, IUserSqlExecutor userSqlExecutor)
            : base(connection, logger)
        {
            _userSqlExecutor = userSqlExecutor;
        }
        public async Task<int> GetRecentFailedAttemptsAsync(Guid persoId)
        {
            string sqlQuery = @"
            SELECT COUNT(*) 
            FROM FailedLoginAttempts 
            WHERE PersoId = @PersoId AND AttemptTime > @CutoffTime";

            return await ExecuteScalarAsync<int>(sqlQuery, new
            {
                PersoId = persoId,
                CutoffTime = DateTime.UtcNow.AddMinutes(-15) // 15 minutes ago
            });
        }

        public async Task LockUserAsync(string email, TimeSpan lockoutDuration)
        {
            var lockoutUntil = DateTime.UtcNow.Add(lockoutDuration);

            string sqlQuery = @"
                UPDATE User 
                SET LockoutUntil = @LockoutUntil 
                WHERE Email = @Email";

            await ExecuteAsync(sqlQuery, new
            {
                LockoutUntil = lockoutUntil,
                Email = email
            });

            _logger.LogInformation("User locked out until {LockoutUntil} for email: {Email}", lockoutUntil, email);
        }
        public async Task UnlockUserAsync(Guid persoId)
        {
            string sqlQuery = @"
            UPDATE User 
            SET LockoutUntil = NULL 
            WHERE PersoId = @PersoId";

            await ExecuteAsync(sqlQuery, new { PersoId = persoId });
            _logger.LogInformation("User unlocked with PersoId: {PersoId}", persoId);
        }
        public async Task RecordFailedLoginAsync(string email, string ipAdress)
        {
            var user = await _userSqlExecutor.GetUserModelAsync(email: email);
            if (user == null)
            {
                _logger.LogWarning("Failed login attempt for non-existent user with email: {Email}", email);
                return;
            }

            string sqlQuery = @"
                INSERT INTO FailedLoginAttempts (PersoId, IpAddress, AttemptTime)
                VALUES (@PersoId, @IpAddress, @AttemptTime)";

            await ExecuteAsync(sqlQuery, new
            {
                PersoId = user.PersoId,
                IpAddress = ipAdress,
                AttemptTime = DateTime.UtcNow
            });

            _logger.LogInformation("Failed login attempt recorded for PersoId: {PersoId}", user.PersoId);
        }
        public async Task<bool> ShouldLockUserAsync(string email)
        {
            var user = await _userSqlExecutor.GetUserModelAsync(email: email);
            if (user == null)
            {
                return false; // No user, no lockout
            }

            var recentFailedAttempts = await GetRecentFailedAttemptsAsync(user.PersoId);
            return recentFailedAttempts >= 5; // Lock the user if failed attempts exceed the threshold
        }
        public async Task<int> GetRecentFailedAttemptsAsync(int persoId)
        {
            string sqlQuery = @"
            SELECT COUNT(*) 
            FROM FailedLoginAttempts 
            WHERE PersoId = @PersoId AND AttemptTime > @CutoffTime";

            return await ExecuteScalarAsync<int>(sqlQuery, new
            {
                PersoId = persoId,
                CutoffTime = DateTime.UtcNow.AddMinutes(-10) // Check within the last 10 minutes
            });
        }
        public async Task ResetFailedLoginAttemptsAsync(Guid persoId)
        {
            string sqlQuery = "DELETE FROM FailedLoginAttempts WHERE PersoId = @PersoId";
            await ExecuteAsync(sqlQuery, new { PersoId = persoId });
        }
        public async Task<bool> UpdatePasswordAsync(Guid persoId, string hashedPassword)
        {
            const string query = @"
                UPDATE Users
                SET PasswordHash = @hashedPassword
                WHERE PersoId = @persoId;
            ";

            var rowsAffected = await ExecuteAsync(query, new { persoId, hashedPassword });
            return rowsAffected > 0;
        }
    }
}
