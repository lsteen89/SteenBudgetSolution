using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget_Queries;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQuries;
using Microsoft.Extensions.Logging;

namespace Backend.Infrastructure.Data.Sql.Providers.BudgetProvider
{
    public class BudgetSqlProvider : IBudgetSqlProvider
    {
        public IBudgetSqlExecutor BudgetSqlExecutor { get; }
        public IDebtsSqlExecutor DebtsSqlExecutor { get; }
        public IIncomeSqlExecutor IncomeSqlExecutor { get; }
        public IExpenditureSqlExecutor ExpenditureSqlExecutor { get; }
        public ISavingsSqlExecutor SavingsSqlExecutor { get; }

        public BudgetSqlProvider(
            IBudgetSqlExecutor budgetSqlExecutor,
            IDebtsSqlExecutor debtsSqlExecutor,
            IIncomeSqlExecutor incomeSqlExecutor,
            IExpenditureSqlExecutor expenditureSqlExecutor,
            ISavingsSqlExecutor savingsSqlExecutor)
        {
            BudgetSqlExecutor = budgetSqlExecutor;
            DebtsSqlExecutor = debtsSqlExecutor;
            IncomeSqlExecutor = incomeSqlExecutor;
            ExpenditureSqlExecutor = expenditureSqlExecutor;
            SavingsSqlExecutor = savingsSqlExecutor;
        }
    }
}