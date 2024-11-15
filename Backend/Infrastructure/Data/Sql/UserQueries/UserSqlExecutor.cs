using Backend.Domain.Entities;
using Dapper;
using System.Data.Common;
using System.Data;

namespace Backend.Infrastructure.Data.Sql.UserQueries
{
    public class UserSqlExecutor : SqlBase
    {
        public UserSqlExecutor(DbConnection connection, ILogger<UserSqlExecutor> logger)
        : base(connection, logger)
        {
        
        }
        public async Task<bool> IsUserExistInDatabaseAsync(string email)
        {
            string sqlQuery = "SELECT COUNT(1) FROM User WHERE Email = @Email";
            return await _connection.ExecuteScalarAsync<bool>(sqlQuery, new { Email = email });
        }
        public async Task<bool> InsertNewUserDatabaseAsync(UserModel user)
        {
            string sqlQuery = @"INSERT INTO User (Persoid, Firstname, Lastname, Email, Password, Roles, CreatedBy)
                            VALUES (@Persoid, @Firstname, @Lastname, @Email, @Password, @Roles, 'System')"
            ;

            try
            {
                using (var transaction = await _connection.BeginTransactionAsync())
                {
                    _logger.LogInformation("Inserting new user into the database.");
                    await ExecuteAsync(sqlQuery, user, transaction);
                    _logger.LogInformation("User inserted successfully");
                    await transaction.CommitAsync();
                }
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inserting new user: {Email}", user.Email);
                return false;
            }
            finally
            {
                // Close the connection after use
                if (_connection.State == ConnectionState.Open)
                {
                    await _connection.CloseAsync();
                }
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

            var user = await _connection.QueryFirstOrDefaultAsync<UserModel>(sqlQuery, parameters);

            if (user == null)
            {
                _logger.LogWarning("User not found in database. Email: {Email}, PersoId: {PersoId}", email, persoid);
                throw new KeyNotFoundException("User not found");
            }

            return user;
        }

        public async Task<bool> UpdateEmailConfirmationStatusAsync(Guid persoid)
        {
            try
            {
                string checkQuery = "SELECT COALESCE(EmailConfirmed, 0) FROM User WHERE PersoId = @PersoId";
                bool isAlreadyVerified = await _connection.QueryFirstOrDefaultAsync<bool>(checkQuery, new { PersoId = persoid });

                if (isAlreadyVerified)
                {
                    _logger.LogWarning("User is already verified: {Persoid}", persoid);
                    throw new InvalidOperationException("User has already been verified.");
                }

                string updateQuery = "UPDATE User SET EmailConfirmed = 1 WHERE PersoId = @PersoId";
                var result = await _connection.ExecuteAsync(updateQuery, new { PersoId = persoid });

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
            return await _connection.ExecuteAsync(sqlQuery, new { Email = email });
        }    
    }
}
