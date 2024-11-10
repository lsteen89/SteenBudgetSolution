using System.Data.Common;
using Backend.Models;
using Dapper;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Backend.Helpers;
using System.Data.Common;
using Backend.Test.UserTests.BaseClass;

namespace Backend.Helpers.TestClasses.UserTests
{
    namespace Backend.Helpers.TestClasses.UserTests
    {
        public class UserServiceTest : TestDatabaseHelper
        {
            public UserServiceTest(DbConnection connection, ILogger<UserServiceTest> logger)
                : base(connection, logger)
            {
            }
            #region SQL
            public async Task<UserTokenModel> ModifyTokenExpiryAndRetrieveAsync(UserTokenModel userTokenModel)
            {
                string sqlUpdate = "UPDATE VerificationToken SET TokenExpiryDate = @TokenExpiryDate WHERE Persoid = @Persoid";
                await ExecuteAsync(sqlUpdate, new { TokenExpiryDate = userTokenModel.TokenExpiryDate, Persoid = userTokenModel.PersoId });

                // Retrieve the updated record to return the modified UserTokenModel
                string sqlSelect = "SELECT Persoid, token, TokenExpiryDate FROM VerificationToken WHERE Persoid = @Persoid";
                var updatedToken = await _connection.QuerySingleAsync<UserTokenModel>(sqlSelect, new { Persoid = userTokenModel.PersoId });

                return updatedToken;
            }
            #endregion
        }
    }
}
