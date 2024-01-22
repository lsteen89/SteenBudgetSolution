using Backend.DataAccess;

namespace Backend.Services
{
    public class UserServices
    {
        private SqlExecutor _sqlExecutor;       

        public bool CheckIfUserExists(string email)
        {
            _sqlExecutor = new SqlExecutor();
            return _sqlExecutor.IsUserExistInDatabase(email);
        }
    }
}
