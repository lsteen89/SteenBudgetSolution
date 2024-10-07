using Backend.Models;
using Dapper;
using System.Data;
using Backend.Helpers;
using Microsoft.IdentityModel.Logging;
using System.Runtime.CompilerServices;

namespace Backend.DataAccess
{
    public class SqlExecutor
    {
        private Helpers.LogHelper _logHelper;
        private void LogWriter(UserModel user, string message, [CallerMemberName] string methodName = "")
        {
            _logHelper = new Helpers.LogHelper();
            string userInput = _logHelper.CreateUserLogHelper(user);
            using (var logConnection = GlobalConfig.GetConnection())
            {
                //For testing purposes
                string logSql = "INSERT INTO ErrorLog (ErrorMessage, Caller, SubmittedBy, UserInput) VALUES ('Test Error', 'TestMethod', 'System', 'TestInput')";
                logConnection.Execute(logSql);
                // Test SELECT statement to check if INSERT was successful
                var result = logConnection.Query("SELECT * FROM ErrorLog WHERE ErrorMessage = 'Test Error'");
                foreach (var row in result)
                {
                    Console.WriteLine($"{row.ErrorMessage} | {row.Caller} | {row.SubmittedBy} | {row.UserInput}");
                }

                // Test the actual logging with parameters
                string paramSql = "INSERT INTO ErrorLog (ErrorMessage, Caller, SubmittedBy, UserInput) VALUES (@ErrorMessage, @Caller, @SubmittedBy, @UserInput)";
                logConnection.Execute(paramSql, new { ErrorMessage = message, Caller = methodName, SubmittedBy = "System", UserInput = userInput });

                //For production
                /*
                string logSql = "INSERT INTO ErrorLog (ErrorMessage, Caller, SubmittedBy, UserInput) VALUES (@ErrorMessage, @Caller, @SubmittedBy, @UserInput)";
                logConnection.Execute(logSql, new { ErrorMessage = message, Caller = methodName, SubmittedBy = "System", UserInput = userInput });
                */
            }
        }
        public bool IsUserExistInDatabase(string email)
        {
            using (var connection = GlobalConfig.GetConnection())
            {
                string sqlQuery = "SELECT COUNT(1) FROM User WHERE Email = @Email";
                return connection.ExecuteScalar<bool>(sqlQuery, new { Email = email });
            }
        }
        public bool InsertNewUserDatabase(UserModel user) 
        {
            using (var connection = GlobalConfig.GetConnection())
            {
            string sqlQuery = @"INSERT INTO User (Persoid, Firstname, Lastname, Email, Password, Roles, CreatedBy)
                VALUES (@Persoid, @Firstname, @Lastname, @Email, @Password, @Roles, 'System')";

            IDbTransaction transaction = null;
                try
                {
                    transaction = connection.BeginTransaction();

                    //Create persoid and roles for new user
                    user.PersoId = Guid.NewGuid().ToString();
                    user.Roles = "1";    

                    //Insert user into database
                    connection.Execute(sqlQuery, user, transaction);

                    //Generate token for user
                    GenerateUserToken(user.PersoId, connection, transaction);

                    transaction.Commit();

                    return true;
                }
                catch (Exception ex)
                {
                    transaction?.Rollback();
                    LogWriter(user, ex.ToString()); 
                    return false;
                }
                finally
                {
                    connection.Close();
                }
            }
        }
        public UserModel GetUserByEmailFromDatabase(string email)
        {
            using (var connection = GlobalConfig.GetConnection())
            {
                string sqlQuery = "SELECT * FROM User WHERE Email = @Email";
                return connection.QueryFirstOrDefault<UserModel>(sqlQuery, new { Email = email });
            }
        }
        public bool UpdateUserInDatabase(UserModel user)
        {
            using (var connection = GlobalConfig.GetConnection())
            {
                string sqlQuery = "UPDATE User SET EmailConfirmed = @IsVerified WHERE Email = @Email";
                var result = connection.Execute(sqlQuery, new { IsVerified = user.IsVerified, Email = user.Email });
                return result > 0;
            }
        }
        public void GenerateUserToken(string persoId, IDbConnection connection, IDbTransaction transaction)
        {
            string token = Guid.NewGuid().ToString(); // Generate a new token
            DateTime expiryDate = DateTime.UtcNow.AddHours(24); // Token expires in 24 hours, because why not?

            string insertTokenQuery = @"INSERT INTO VerificationTokens (PersoId, Token, TokenExpiryDate)
                                VALUES (@PersoId, @Token, @TokenExpiryDate)";

            connection.Execute(insertTokenQuery, new
            {
                PersoId = persoId,
                Token = token,
                TokenExpiryDate = expiryDate
            }, transaction);
        }
        public string GetUserVerificationToken(string persoId)
        {
            using (var connection = GlobalConfig.GetConnection())
            {
                string sqlQuery = "SELECT Token FROM VerificationTokens WHERE PersoId = @PersoId";

                var token = connection.QuerySingleOrDefault<string>(sqlQuery, new { PersoId = persoId });

                return token;
            }
        }


    }
}
