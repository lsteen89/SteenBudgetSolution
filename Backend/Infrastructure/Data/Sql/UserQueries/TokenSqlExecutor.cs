using Backend.Domain.Entities;
using System.Data.Common;
using Dapper;
using Backend.Infrastructure.Data.Sql.Interfaces;
namespace Backend.Infrastructure.Data.Sql.UserQueries
{
    public class TokenSqlExecutor : SqlBase, ITokenSqlExecutor
    {
        private readonly IUserSqlExecutor _userSqlExecutor;
        public TokenSqlExecutor(DbConnection connection, ILogger<TokenSqlExecutor> logger, IUserSqlExecutor userSqlExecutor)
:       base(connection, logger)
        {
            _userSqlExecutor = userSqlExecutor; 
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
        public async Task<bool> InsertUserTokenAsync(UserTokenModel tokenModel)
        {
            try
            {
                string insertTokenQuery = @"INSERT INTO VerificationToken (PersoId, Token, TokenExpiryDate)
                                    VALUES (@PersoId, @Token, @TokenExpiryDate)";

                // Execute the query and check the result
                int rowsAffected = await ExecuteAsync(insertTokenQuery, new
                {
                    tokenModel.PersoId,
                    tokenModel.Token,
                    tokenModel.TokenExpiryDate
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

        public async Task<UserTokenModel?> GetUserVerificationTokenByPersoIdAsync(Guid persoid)
        {
            string sqlQuery = "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE PersoId = @PersoId";
            var result = await QueryFirstOrDefaultAsync<UserTokenModel>(sqlQuery, new { PersoId = persoid });

            if (result == null)
                return null;

            return new UserTokenModel
            {
                PersoId = result.PersoId,
                Token = result.Token,
                TokenExpiryDate = result.TokenExpiryDate
            };
        }

        public async Task<UserTokenModel?> GetUserVerificationTokenByTokenAsync(Guid token)
        {
            string sqlQuery = "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE Token = @Token";
            var result = await QueryFirstOrDefaultAsync<UserTokenModel>(sqlQuery, new { Token = token });

            if (result == null)
                return null;


            return new UserTokenModel
            {
                PersoId = result.PersoId,
                Token = result.Token,
                TokenExpiryDate = result.TokenExpiryDate
            };
        }

        public async Task<UserVerificationTrackingModel> GetUserVerificationTrackingAsync(Guid persoId)
        {
            string sql = "SELECT * FROM UserVerificationTracking WHERE PersoId = @PersoId";
            return await QueryFirstOrDefaultAsync<UserVerificationTrackingModel>(sql, new { PersoId = persoId });
        }

        public async Task InsertUserVerificationTrackingAsync(UserVerificationTrackingModel tracking)
        {
            string sql = "INSERT INTO UserVerificationTracking (PersoId, LastResendRequestTime, DailyResendCount, LastResendRequestDate, CreatedAt, UpdatedAt) " +
                         "VALUES (@PersoId, @LastResendRequestTime, @DailyResendCount, @LastResendRequestDate, @CreatedAt, @UpdatedAt)";
            await ExecuteAsync(sql, tracking);
        }

        public async Task UpdateUserVerificationTrackingAsync(UserVerificationTrackingModel tracking)
        {
            string sql = "UPDATE UserVerificationTracking SET LastResendRequestTime = @LastResendRequestTime, DailyResendCount = @DailyResendCount, " +
                         "LastResendRequestDate = @LastResendRequestDate, UpdatedAt = @UpdatedAt WHERE PersoId = @PersoId";
            await ExecuteAsync(sql, tracking);
        }
        public async Task<int> DeleteUserTokenByPersoidAsync(Guid persoid)
        {
            string sqlQuery = "DELETE FROM verificationtoken WHERE Persoid = @Persoid";
            return await ExecuteAsync(sqlQuery, new { Persoid = persoid });
        }
        public async Task SaveResetTokenAsync(Guid persoId, Guid token)
        {
            string deleteOldTokensQuery = "DELETE FROM PasswordResetTokens WHERE PersoId = @PersoId";
            await ExecuteAsync(deleteOldTokensQuery, new { PersoId = persoId });

            string sqlQuery = @"
            INSERT INTO PasswordResetTokens (PersoId, Token, Expiry)
            VALUES (@PersoId, @Token, @Expiry)";

            await ExecuteAsync(sqlQuery, new
            {
                PersoId = persoId,
                Token = token,
                Expiry = DateTime.UtcNow.AddHours(1) // Token valid for 1 hour
            });
        }
        public async Task<bool> ValidateResetTokenAsync(Guid token)
        {

            string sqlQuery = @"
            SELECT COUNT(*) 
            FROM PasswordResetTokens 
            WHERE Token = @Token AND Expiry > @CurrentTime";

            _logger.LogInformation("SQL Query: {Query}, Token: {Token}, CurrentTime: {CurrentTime}",
                sqlQuery, token, DateTime.UtcNow);

            var count = await ExecuteScalarAsync<int>(sqlQuery, new
            {
                Token = token,
                CurrentTime = DateTime.UtcNow
            });

            return count > 0;
        }
        public async Task<UserModel> GetUserFromResetTokenAsync(Guid token)
        {
            string sqlQuery = @"
                SELECT u.PersoId, u.Email, u.Password 
                FROM PasswordResetTokens t
                INNER JOIN User u ON u.PersoId = t.PersoId
                WHERE t.Token = @Token AND t.Expiry > @CurrentTime";

            _logger.LogInformation("SQL Query: {Query}, Token: {Token}, CurrentTime: {CurrentTime}",
                sqlQuery, token, DateTime.UtcNow);

            var user = await QueryFirstOrDefaultAsync<UserModel>(sqlQuery, new
            {
                Token = token,
                CurrentTime = DateTime.UtcNow
            });

            if (user == null)
            {
                _logger.LogWarning("No user found for token: {Token}", token);
            }

            return user;
        }
        public async Task<IEnumerable<UserTokenModel>> GetResetTokensByPersoIdAsync(Guid persoId)
        {
            string sqlQuery = "SELECT PersoId, Token, Expiry FROM PasswordResetTokens WHERE PersoId = @PersoId";
            return await QueryAsync<UserTokenModel>(sqlQuery, new { PersoId = persoId });
        }
    }
}
