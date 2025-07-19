using Backend.Infrastructure.Data.Sql.Interfaces.Queries;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Providers
{
    public interface IBudgetSqlProvider
    {
        IIncomeSqlExecutor IncomeSqlExecutor { get; }
        IExpenditureSqlExecutor ExpenditureSqlExecutor { get; }
        ISavingsSqlExecutor SavingsSqlExecutor { get; }
    }
}