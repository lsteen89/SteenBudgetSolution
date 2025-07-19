using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries;
using Microsoft.Extensions.Logging;

namespace Backend.Infrastructure.Data.Sql.Providers.BudgetProvider
{
    public class BudgetSqlProvider : IBudgetSqlProvider
    {
        public IIncomeSqlExecutor IncomeSqlExecutor { get; }
        public IExpenditureSqlExecutor ExpenditureSqlExecutor { get; }
        public ISavingsSqlExecutor SavingsSqlExecutor { get; }

        public BudgetSqlProvider(
            IIncomeSqlExecutor incomeSqlExecutor,
            IExpenditureSqlExecutor expenditureSqlExecutor,
            ISavingsSqlExecutor savingsSqlExecutor)
        {
            IncomeSqlExecutor = incomeSqlExecutor;
            ExpenditureSqlExecutor = expenditureSqlExecutor;
            SavingsSqlExecutor = savingsSqlExecutor;
        }
    }
}