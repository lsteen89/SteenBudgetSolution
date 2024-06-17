using Backend.DataAccess;
using Backend.Models;

namespace Backend.Services
{
    public class UserServices
    {
        private readonly SqlExecutor _sqlExecutor;

        public UserServices(SqlExecutor sqlExecutor)
        {
            _sqlExecutor = sqlExecutor;
        }

        public bool CheckIfUserExists(string email)
        {
            return _sqlExecutor.IsUserExistInDatabase(email);
        }

        public bool CreateNewRegisteredUser(UserModel user)
        {
            return _sqlExecutor.InsertNewUserDatabase(user);
        }
    }
}
