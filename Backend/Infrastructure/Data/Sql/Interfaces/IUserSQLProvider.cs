namespace Backend.Infrastructure.Data.Sql.Interfaces
{
    public interface IUserSQLProvider
    {
        IUserSqlExecutor UserSqlExecutor { get; }
        ITokenSqlExecutor TokenSqlExecutor { get; }
        IAuthenticationSqlExecutor AuthenticationSqlExecutor { get; }
    }
}
