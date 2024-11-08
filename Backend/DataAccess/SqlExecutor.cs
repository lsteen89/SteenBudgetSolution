using Backend.Models;
using Dapper;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Backend.Helpers;
using System.Data.Common;

namespace Backend.DataAccess
{
    public class SqlExecutor
    {
        private readonly DbConnection _connection;
        private readonly ILogger<SqlExecutor> _logger;

        public SqlExecutor(DbConnection connection, ILogger<SqlExecutor> logger)
        {
            _connection = connection;
            _logger = logger;
        }

        public async Task<int> ExecuteAsync(string sql, object? parameters = null, DbTransaction? transaction = null)
        {
            try
            {
                return await _connection.ExecuteAsync(sql, parameters, transaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing SQL: {Sql}", sql);
                throw;
            }
        }
        public async Task<bool> IsUserExistInDatabaseAsync(string email)
        {
            string sqlQuery = "SELECT COUNT(1) FROM User WHERE Email = @Email";
            return await _connection.ExecuteScalarAsync<bool>(sqlQuery, new { Email = email });
        }
        public async Task<bool> InsertNewUserDatabaseAsync(UserModel user)
        {
            string sqlQuery = @"INSERT INTO User (Persoid, Firstname, Lastname, Email, Password, Roles, CreatedBy)
                            VALUES (@Persoid, @Firstname, @Lastname, @Email, @Password, @Roles, 'System')";

            try
            {
                if (_connection.State == ConnectionState.Closed)
                {
                    await _connection.OpenAsync();
                }
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

        public async Task<UserTokenModel> GenerateUserTokenAsync(Guid persoId)
        {
            return new UserTokenModel
            {
                PersoId = persoId,
                Token = Guid.NewGuid().ToString(),
                TokenExpiryDate = DateTime.UtcNow.AddHours(24)
            };
        }
        public async Task<bool> InsertUserTokenAsync(UserTokenModel tokenModel)
        {
            try
            {
                string insertTokenQuery = @"INSERT INTO VerificationToken (PersoId, Token, TokenExpiryDate)
                                    VALUES (@PersoId, @Token, @TokenExpiryDate)";

                // Execute the query and check the result
                int rowsAffected = await ExecuteAsync(insertTokenQuery, new
                {
                    PersoId = tokenModel.PersoId,
                    Token = tokenModel.Token,
                    TokenExpiryDate = tokenModel.TokenExpiryDate
                });

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
        
        public async Task<UserTokenModel?> GetUserVerificationTokenDataAsync(Guid? persoid = null, string? token = null)
        {
            if (persoid == null && token == null)
            {
                throw new ArgumentException("Either PersoId or Token must be provided.");
            }
            string sqlQuery = persoid != null
                ? "SELECT PersoId, TokenExpiryDate, Token FROM VerificationToken WHERE PersoId = @PersoId"
                : "SELECT PersoId, TokenExpiryDate, Token FROM VerificationToken WHERE Token = @Token";

            object parameters = persoid != null
                ? new { PersoId = persoid }
                : new { Token = token };

            var tokenData = await _connection.QueryFirstOrDefaultAsync<UserTokenModel>(sqlQuery, parameters);

            if (tokenData == null)
            {
                _logger.LogWarning("Token not found in database for {IdentifierType}: {Identifier}", persoid != null ? "PersoId" : "Token", persoid ?? (object)token!);
                throw new KeyNotFoundException($"{(persoid != null ? "PersoId" : "Token")} not found");
            }

            return tokenData;
        }
        public async Task<UserVerificationTrackingModel> GetUserVerificationTrackingAsync(Guid persoId)
        {
            string sql = "SELECT * FROM UserVerificationTracking WHERE PersoId = @PersoId";
            return await _connection.QueryFirstOrDefaultAsync<UserVerificationTrackingModel>(sql, new { PersoId = persoId });
        }

        public async Task InsertUserVerificationTrackingAsync(UserVerificationTrackingModel tracking)
        {
            string sql = "INSERT INTO UserVerificationTracking (PersoId, LastResendRequestTime, DailyResendCount, LastResendRequestDate, CreatedAt, UpdatedAt) " +
                         "VALUES (@PersoId, @LastResendRequestTime, @DailyResendCount, @LastResendRequestDate, @CreatedAt, @UpdatedAt)";
            await _connection.ExecuteAsync(sql, tracking);
        }

        public async Task UpdateUserVerificationTrackingAsync(UserVerificationTrackingModel tracking)
        {
            string sql = "UPDATE UserVerificationTracking SET LastResendRequestTime = @LastResendRequestTime, DailyResendCount = @DailyResendCount, " +
                         "LastResendRequestDate = @LastResendRequestDate, UpdatedAt = @UpdatedAt WHERE PersoId = @PersoId";
            await _connection.ExecuteAsync(sql, tracking);
        }
        public async Task<int> DeleteUserByEmailAsync(string email)
        {
            string sqlQuery = "DELETE FROM User WHERE Email = @Email";
            return await _connection.ExecuteAsync(sqlQuery, new { Email = email });
        }
        public async Task<int> DeleteUserTokenByPersoidAsync(Guid persoid)
        {
            string sqlQuery = "DELETE FROM verificationtoken WHERE Persoid = @Persoid";
            return await _connection.ExecuteAsync(sqlQuery, new { Persoid = persoid });
        }
    }
}
