using Backend.Infrastructure.Data.Sql.Interfaces;

namespace Backend.Infrastructure.Data.Sql.Provider
{
    public class UserSQLProvider : IUserSQLProvider
    {
        public IUserSqlExecutor UserSqlExecutor { get; }
        public IVerificationTokenSqlExecutor TokenSqlExecutor { get; }
        public IAuthenticationSqlExecutor AuthenticationSqlExecutor { get; }
        public IRefreshTokenSqlExecutor RefreshTokenSqlExecutor { get; }

        public UserSQLProvider(
            IUserSqlExecutor userSqlExecutor,
            IVerificationTokenSqlExecutor tokenSqlExecutor,
            IAuthenticationSqlExecutor authenticationSqlExecutor,
            IRefreshTokenSqlExecutor refreshTokenSqlExecutor)
        {
            UserSqlExecutor = userSqlExecutor;
            TokenSqlExecutor = tokenSqlExecutor;
            AuthenticationSqlExecutor = authenticationSqlExecutor;
            RefreshTokenSqlExecutor = refreshTokenSqlExecutor;
        }
    }
}
