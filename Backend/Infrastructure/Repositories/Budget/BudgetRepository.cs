using Backend.Domain.Entities.Wizard;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget_Queries;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQuries;
using Backend.Infrastructure.Data.Sql.Providers.BudgetProvider;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class BudgetRepository : IBudgetRepository
    {
        private readonly IBudgetSqlExecutor _budgetSqlExecutor;

        public BudgetRepository(IBudgetSqlExecutor budgetSqlExecutor)
        {
            _budgetSqlExecutor = budgetSqlExecutor;
        }

        public async Task UpdateRepaymentStrategyAsync(string strat, Guid budgetId)
        {
            await _budgetSqlExecutor.UpdateRepaymentStrategyAsync(strat, budgetId);
        }
    }
}

