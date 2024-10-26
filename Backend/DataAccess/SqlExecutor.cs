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
                user.PersoId = Guid.NewGuid();
                user.Roles = "1";
                if (_connection.State == ConnectionState.Closed)
                {
                    await _connection.OpenAsync();
                }
                using (var transaction = await _connection.BeginTransactionAsync())
                {
                    _logger.LogInformation("Inserting new user into the database.");
                    await ExecuteAsync(sqlQuery, user, transaction);
                    _logger.LogInformation("User inserted successfully, generating token.");

                    await GenerateUserTokenAsync(user.PersoId, transaction);
                    _logger.LogInformation("Token generated successfully.");
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

        public async Task<UserModel> GetUserForRegistrationAsync(Guid? persoid = null, string? email = null)
        {
            if (persoid == null && string.IsNullOrEmpty(email))
            {
                throw new ArgumentException("Either PersoId or Email must be provided.");
            }

            string sqlQuery = persoid != null
                ? "SELECT PersoId, Email, EmailConfirmed FROM User WHERE PersoId = @PersoId"
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

        public async Task<bool> UpdateEmailConfirmationStatusAsync(UserModel user)
        {
            string checkQuery = "SELECT COALESCE(EmailConfirmed, 0) FROM User WHERE PersoId = @PersoId";
            bool isAlreadyVerified = await _connection.QueryFirstOrDefaultAsync<bool>(checkQuery, new { PersoId = user.PersoId });

            if (isAlreadyVerified)
            {
                _logger.LogWarning("User is already verified: {Email}", user.Email);
                throw new InvalidOperationException("User has already been verified.");
            }

            string updateQuery = "UPDATE User SET EmailConfirmed = @IsVerified WHERE PersoId = @PersoId";
            var result = await _connection.ExecuteAsync(updateQuery, new { IsVerified = user.EmailConfirmed, PersoId = user.PersoId });

            return result > 0;
        }

        private async Task GenerateUserTokenAsync(Guid persoId, DbTransaction transaction)
        {
            string token = Guid.NewGuid().ToString();
            DateTime expiryDate = DateTime.UtcNow.AddHours(24);

            string insertTokenQuery = @"INSERT INTO VerificationToken (PersoId, Token, TokenExpiryDate)
                                        VALUES (@PersoId, @Token, @TokenExpiryDate)";

            await ExecuteAsync(insertTokenQuery, new
            {
                PersoId = persoId,
                Token = token,
                TokenExpiryDate = expiryDate
            }, transaction);
        }

        public async Task<string> GetUserVerificationTokenAsync(string persoId)
        {
            string sqlQuery = "SELECT CAST(Token AS CHAR(36)) FROM VerificationToken WHERE PersoId = @PersoId";
            var token = await _connection.QuerySingleOrDefaultAsync<string>(sqlQuery, new { PersoId = persoId });
            if (token == null)
            {
                _logger.LogWarning("Token not found in database for PersoId: {PersoId}", persoId);
                throw new KeyNotFoundException("Token not found");
            }
            return token;
        }

        public async Task<TokenModel?> GetUserVerificationTokenDataAsync(string token)
        {
            string sqlQuery = "SELECT PersoId, TokenExpiryDate FROM VerificationToken WHERE Token = @Token";
            return await _connection.QueryFirstOrDefaultAsync<TokenModel>(sqlQuery, new { Token = token });
        }
        public async Task<UserVerificationTracking> GetUserVerificationTrackingAsync(Guid persoId)
        {
            string sql = "SELECT * FROM UserVerificationTracking WHERE PersoId = @PersoId";
            return await _connection.QueryFirstOrDefaultAsync<UserVerificationTracking>(sql, new { PersoId = persoId });
        }

        public async Task InsertUserVerificationTrackingAsync(UserVerificationTracking tracking)
        {
            string sql = "INSERT INTO UserVerificationTracking (PersoId, LastResendRequestTime, DailyResendCount, LastResendRequestDate, CreatedAt, UpdatedAt) " +
                         "VALUES (@PersoId, @LastResendRequestTime, @DailyResendCount, @LastResendRequestDate, @CreatedAt, @UpdatedAt)";
            await _connection.ExecuteAsync(sql, tracking);
        }

        public async Task UpdateUserVerificationTrackingAsync(UserVerificationTracking tracking)
        {
            string sql = "UPDATE UserVerificationTracking SET LastResendRequestTime = @LastResendRequestTime, DailyResendCount = @DailyResendCount, " +
                         "LastResendRequestDate = @LastResendRequestDate, UpdatedAt = @UpdatedAt WHERE PersoId = @PersoId";
            await _connection.ExecuteAsync(sql, tracking);
        }
    }
}
