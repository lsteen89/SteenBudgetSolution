using Backend.Domain.Entities;
using Dapper;
using System.Data.Common;
using System.Data;
using Backend.Infrastructure.Data.Sql.Interfaces;

namespace Backend.Infrastructure.Data.Sql.UserQueries
{
    public class UserSqlExecutor : SqlBase, IUserSqlExecutor
    {
        public UserSqlExecutor(DbConnection connection, ILogger<UserSqlExecutor> logger)
        : base(connection, logger)
        {
        
        }
        public async Task<bool> IsUserExistInDatabaseAsync(string email)
        {
            string sqlQuery = "SELECT COUNT(1) FROM User WHERE Email = @Email";
            var userExists = await ExecuteScalarAsync<int>(sqlQuery, new { Email = email });
            return userExists > 0;
        }
        public async Task<bool> InsertNewUserDatabaseAsync(UserModel user)
        {
            string sqlQuery = @"INSERT INTO User (Persoid, Firstname, Lastname, Email, Password, Roles, CreatedBy)
                        VALUES (@Persoid, @Firstname, @Lastname, @Email, @Password, @Roles, 'System')";

            try
            {
                _logger.LogInformation("Starting transaction to insert new user into the database.");

                // Use ExecuteInTransactionAsync to handle transaction, connection, and error handling.
                await ExecuteInTransactionAsync(async transaction =>
                {
                    _logger.LogInformation("Inserting new user into the database.");
                    await ExecuteAsync(sqlQuery, user, transaction);
                    _logger.LogInformation("User inserted successfully.");
                });

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inserting new user: {Email}", user.Email);
                return false;
            }
        }
        public async Task<UserModel> GetUserModelAsync(Guid? persoid = null, string? email = null)
        {
            if (persoid == null && string.IsNullOrEmpty(email))
            {
                throw new ArgumentException("Either PersoId or Email must be provided.");
            }

            string sqlQuery = persoid != null
                ? "SELECT * FROM User WHERE PersoId = @PersoId"
                : "SELECT * FROM User WHERE Email = @Email";

            var parameters = new DynamicParameters();

            if (persoid != null)
            {
                parameters.Add("PersoId", persoid);
            }
            else
            {
                parameters.Add("Email", email);
            }

            var user = await QueryFirstOrDefaultAsync<UserModel>(sqlQuery, parameters);

            if (user == null)
            {
                _logger.LogWarning("User not found in database. Email: {Email}, PersoId: {PersoId}", email, persoid);
            }

            return user;
        }

        public async Task<bool> UpdateEmailConfirmationStatusAsync(Guid persoid)
        {
            try
            {
                string checkQuery = "SELECT COALESCE(EmailConfirmed, 0) FROM User WHERE PersoId = @PersoId";
                bool isAlreadyVerified = await QueryFirstOrDefaultAsync<bool>(checkQuery, new { PersoId = persoid });

                if (isAlreadyVerified)
                {
                    _logger.LogWarning("User is already verified: {Persoid}", persoid);
                    throw new InvalidOperationException("User has already been verified.");
                }

                string updateQuery = "UPDATE User SET EmailConfirmed = 1 WHERE PersoId = @PersoId";
                var result = await ExecuteAsync(updateQuery, new { PersoId = persoid });

                return result > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update email confirmation status for Persoid: {Persoid}", persoid);
                throw; // Re-throwing to let the calling method handle if necessary
            }
        }
        public async Task<int> DeleteUserByEmailAsync(string email)
        {
            string sqlQuery = "DELETE FROM User WHERE Email = @Email";
            return await ExecuteAsync(sqlQuery, new { Email = email });
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
            var user = await GetUserModelAsync(email: email);
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
            var user = await GetUserModelAsync(email: email);
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
    }
}
