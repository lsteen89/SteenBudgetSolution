namespace Backend.Infrastructure.Data.Sql.Interfaces
{
    public interface IUserSQLProvider
    {
        IUserSqlExecutor UserSqlExecutor { get; }
        IVerificationTokenSqlExecutor TokenSqlExecutor { get; }
        IAuthenticationSqlExecutor AuthenticationSqlExecutor { get; }
        IRefreshTokenSqlExecutor RefreshTokenSqlExecutor { get; }
    }
}
