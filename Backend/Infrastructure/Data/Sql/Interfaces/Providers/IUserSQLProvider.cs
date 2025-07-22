using Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Providers
{
    public interface IUserSQLProvider
    {
        IUserSqlExecutor UserSqlExecutor { get; }
        IVerificationTokenSqlExecutor TokenSqlExecutor { get; }
        IAuthenticationSqlExecutor AuthenticationSqlExecutor { get; }
        IRefreshTokenSqlExecutor RefreshTokenSqlExecutor { get; }
    }
}
