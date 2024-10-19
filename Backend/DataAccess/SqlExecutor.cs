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
        private Helpers.LogHelper? _logHelper;
        private void LogWriter(UserModel? user, string message, [CallerMemberName] string methodName = "")
        {
            _logHelper = new Helpers.LogHelper();
            string userInput = user == null ? "No user information" : _logHelper.CreateUserLogHelper(user);
            using (var logConnection = GlobalConfig.GetConnection())
            {
                /*
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
                */

                //For production
                string logSql = "INSERT INTO ErrorLog (ErrorMessage, Caller, SubmittedBy, UserInput) VALUES (@ErrorMessage, @Caller, @SubmittedBy, @UserInput)";
                logConnection.Execute(logSql, new { ErrorMessage = message, Caller = methodName, SubmittedBy = "System", UserInput = userInput });
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

                try
                {
                    using (var transaction = connection.BeginTransaction())
                    {
                        // Create persoid and roles for new user
                        user.PersoId = Guid.NewGuid();
                        user.Roles = "1";

                        // Insert user into database
                        connection.Execute(sqlQuery, user, transaction);

                        // Generate token for user
                        GenerateUserToken(user.PersoId, connection, transaction);

                        transaction.Commit();
                    }
                    return true;
                }
                catch (Exception ex)
                {
                    LogWriter(user, ex.ToString());
                    return false;
                }
                finally
                {
                    connection.Close();
                }
            }
        }
        public UserModel GetUserForRegistration(Guid? persoid = null, string? email = null)
        {
            if (persoid == null && string.IsNullOrEmpty(email))
            {
                throw new ArgumentException("Either PersoId or Email must be provided.");
            }

            using (var connection = GlobalConfig.GetConnection())
            {
                string sqlQuery;
                object parameters;

                if (persoid != null)
                {
                    sqlQuery = "SELECT PersoId, Email, EmailConfirmed FROM User WHERE PersoId = @PersoId";
                    parameters = new { PersoId = persoid };
                }
                else
                {
                    sqlQuery = "SELECT * FROM User WHERE Email = @Email";
                    parameters = new { Email = email };
                }

                var user = connection.QueryFirstOrDefault<UserModel>(sqlQuery, parameters);

                if (user == null)
                {
                    LogWriter(null, $"User not found in database. Email: {email}, PersoId: {persoid}");
                    throw new KeyNotFoundException("User not found");
                }

                return user;
            }
        }

        public bool UpdateEmailConfirmationStatus(UserModel user)
        {
            using (var connection = GlobalConfig.GetConnection())
            {
                // First, check if the user is already verified
                string checkQuery = "SELECT COALESCE(EmailConfirmed, 0) FROM User WHERE PersoId = @PersoId";
                bool isAlreadyVerified = connection.QueryFirstOrDefault<bool>(checkQuery, new { PersoId = user.PersoId });

                if (isAlreadyVerified)
                {
                    // Log the error and throw an exception if the user is already verified
                    LogWriter(user, "User is already verified.");
                    throw new InvalidOperationException("User has already been verified.");
                }

                // Proceed with the update if the user is not already verified
                string updateQuery = "UPDATE User SET EmailConfirmed = @IsVerified WHERE PersoId = @PersoId";
                var result = connection.Execute(updateQuery, new { IsVerified = user.IsVerified, PersoId = user.PersoId });

                return result > 0;
            }
        }

        public void GenerateUserToken(Guid persoId, IDbConnection connection, IDbTransaction transaction)
        {
            string token = Guid.NewGuid().ToString(); // Generate a new token
            DateTime expiryDate = DateTime.UtcNow.AddHours(24); // Token expires in 24 hours, because why not?

            string insertTokenQuery = @"INSERT INTO VerificationToken (PersoId, Token, TokenExpiryDate)
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
                string sqlQuery = "SELECT CAST(Token AS CHAR(36)) FROM VerificationToken WHERE PersoId = @PersoId";

                var token = connection.QuerySingleOrDefault<string>(sqlQuery, new { PersoId = persoId });
                if (token == null)
                {
                    LogWriter(null, "Token not found in database");
                    throw new KeyNotFoundException("Token not found");
                }
                return token;
            }
        }
        public TokenModel? GetUserVerificationTokenData(string token)
        {
            using (var connection = GlobalConfig.GetConnection())
            {
                string sqlQuery = "SELECT PersoId, TokenExpiryDate FROM VerificationToken WHERE Token = @Token";

                var tokenData = connection.QueryFirstOrDefault<TokenModel>(sqlQuery, new { Token = token });

                return tokenData;
            }
        }
    }
}
