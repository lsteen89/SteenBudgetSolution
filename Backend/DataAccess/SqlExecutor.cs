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
                string logSql = "INSERT INTO ErrorLog (ErrorMessage, MethodOrigin, SubmittedBy, UserInput) VALUES (@ErrorMessage, @MethodOrigin, @SubmittedBy, @UserInput)";
                logConnection.Execute(logSql, new { ErrorMessage = message, MethodOrigin = methodName, SubmittedBy = "System", UserInput = userInput });
            }
        }
        public bool IsUserExistInDatabase(string email)
        {
            using (var connection = GlobalConfig.GetConnection())
            {
                string sqlQuery = "SELECT * FROM Users WHERE Email = @Email";
                var user = connection.QueryFirstOrDefault(sqlQuery, new { Email = email });
                return user != null;
            }
        }
        public bool InsertNewUserDatabase(UserModel user) 
        {
            using (var connection = GlobalConfig.GetConnection())
            {
            string sqlQuery = @"INSERT INTO Users (Persoid, Firstname, Lastname, Email, Password, Roles, CreatedBy)
                VALUES (@Persoid, @Firstname, @Lastname, @Email, @Password, @Roles, 'System')";

            IDbTransaction transaction = null;
                try
                {
                    transaction = connection.BeginTransaction();

                    user.PersoId = Guid.NewGuid().ToString();

                    user.Roles = "1";    

                    connection.Execute(sqlQuery, user, transaction);

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

    }
}
