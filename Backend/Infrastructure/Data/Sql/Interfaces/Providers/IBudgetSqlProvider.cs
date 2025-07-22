using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget_Queries;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQuries;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Providers
{
    public interface IBudgetSqlProvider
    {
        IBudgetSqlExecutor BudgetSqlExecutor { get; }
        IIncomeSqlExecutor IncomeSqlExecutor { get; }
        IExpenditureSqlExecutor ExpenditureSqlExecutor { get; }
        ISavingsSqlExecutor SavingsSqlExecutor { get; }
        IDebtsSqlExecutor DebtsSqlExecutor { get; }
    }
}