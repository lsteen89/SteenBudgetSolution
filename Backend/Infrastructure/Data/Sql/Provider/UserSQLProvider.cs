using Backend.Infrastructure.Data.Sql.Interfaces;

namespace Backend.Infrastructure.Data.Sql.Provider
{
    public class UserSQLProvider : IUserSQLProvider
    {
        public IUserSqlExecutor UserSqlExecutor { get; }
        public ITokenSqlExecutor TokenSqlExecutor { get; }
        public IAuthenticationSqlExecutor AuthenticationSqlExecutor { get; }

        public UserSQLProvider(
            IUserSqlExecutor userSqlExecutor,
            ITokenSqlExecutor tokenSqlExecutor,
            IAuthenticationSqlExecutor authenticationSqlExecutor)
        {
            UserSqlExecutor = userSqlExecutor;
            TokenSqlExecutor = tokenSqlExecutor;
            AuthenticationSqlExecutor = authenticationSqlExecutor;
        }
    }
}
