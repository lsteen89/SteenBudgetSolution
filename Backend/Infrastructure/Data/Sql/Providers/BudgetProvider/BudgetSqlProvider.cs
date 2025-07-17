using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries;
using Microsoft.Extensions.Logging;

namespace Backend.Infrastructure.Data.Sql.Providers.BudgetProvider
{
    public class BudgetSqlProvider : IBudgetSqlProvider
    {
        public IIncomeSqlExecutor IncomeSqlExecutor { get; }
        public IExpenditureSqlExecutor ExpenditureSqlExecutor { get; }

        public BudgetSqlProvider(
            IIncomeSqlExecutor incomeSqlExecutor,
            IExpenditureSqlExecutor expenditureSqlExecutor)
        {
            IncomeSqlExecutor = incomeSqlExecutor;
            ExpenditureSqlExecutor = expenditureSqlExecutor;
        }
    }
}