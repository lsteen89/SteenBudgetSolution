using Backend.Domain.Entities.Auth;
using Backend.Test.UserTests.BaseClass;
using Dapper;
using System.Data.Common;

namespace Backend.Test.UserTests
{
    public class UserServiceTest : TestDatabaseHelper
        {
            public UserServiceTest(DbConnection connection, ILogger<UserServiceTest> logger)
                : base(connection, logger)
            {
            }
            public async Task<UserTokenModel> ModifyTokenExpiryAndRetrieveAsync(UserTokenModel userTokenModel)
            {
                string sqlUpdate = "UPDATE VerificationToken SET TokenExpiryDate = @TokenExpiryDate WHERE Persoid = @Persoid";
                await ExecuteAsync(sqlUpdate, new { TokenExpiryDate = userTokenModel.TokenExpiryDate, Persoid = userTokenModel.PersoId });

                // Retrieve the updated record to return the modified UserTokenModel
                string sqlSelect = "SELECT Persoid, token, TokenExpiryDate FROM VerificationToken WHERE Persoid = @Persoid";
                var updatedToken = await _connection.QuerySingleAsync<UserTokenModel>(sqlSelect, new { Persoid = userTokenModel.PersoId });

                return updatedToken;
            }
            public async Task ConfirmUserEmailAsync(Guid persoId)
            {
                const string sql = "UPDATE User SET EmailConfirmed = 1 WHERE PersoId = @PersoId";
                await ExecuteAsync(sql, new { PersoId = persoId });
            }
    }
}
