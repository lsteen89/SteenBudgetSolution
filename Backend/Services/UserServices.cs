using Backend.DataAccess;
using Backend.Models;

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
        public bool CreateNewRegisteredUser(UserModel user)
        {
            _sqlExecutor = new SqlExecutor();
            bool UserInserted = _sqlExecutor.InsertNewUserDatabase(user);
            return UserInserted;
        }
    }
}
