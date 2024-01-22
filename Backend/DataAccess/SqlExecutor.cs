using Dapper;

namespace Backend.DataAccess
{
    public class SqlExecutor
    {
        public bool IsUserExistInDatabase(string email)
        {
            using (var connection = GlobalConfig.GetConnection())
            {
                string sqlQuery = "SELECT * FROM Users WHERE Email = @Email";
                var user = connection.QueryFirstOrDefault(sqlQuery, new { Email = email });
                return user != null;
            }
        }
    }
}
