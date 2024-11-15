using Backend.Domain.Entities;
using System.Data.Common;
using Dapper;
namespace Backend.Infrastructure.Data.Sql.UserQueries
{
    public class TokenSqlExecutor : SqlBase
    {
        public TokenSqlExecutor(DbConnection connection, ILogger<UserSqlExecutor> logger)
:       base(connection, logger)
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
            var result = await _connection.QueryFirstOrDefaultAsync(sqlQuery, new { PersoId = persoid });

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
            var result = await _connection.QueryFirstOrDefaultAsync(sqlQuery, new { Token = token });

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
        public async Task<int> DeleteUserTokenByPersoidAsync(Guid persoid)
        {
            string sqlQuery = "DELETE FROM verificationtoken WHERE Persoid = @Persoid";
            return await _connection.ExecuteAsync(sqlQuery, new { Persoid = persoid });
        }
    }
}
