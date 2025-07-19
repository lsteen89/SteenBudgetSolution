using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class ExpenditureRepository : IExpenditureRepository
    {
        private readonly IBudgetSqlProvider _budgetSqlProvider;

        public ExpenditureRepository(IBudgetSqlProvider budgetSqlProvider)
        {
            _budgetSqlProvider = budgetSqlProvider;
        }

        public async Task AddAsync(Expense expenditure, Guid budgetId)
        {
            if (expenditure.BudgetId != budgetId)
                expenditure.BudgetId = budgetId;
            await _budgetSqlProvider.ExpenditureSqlExecutor.InsertExpenseItemsAsync(expenditure);
        }
    }
}
