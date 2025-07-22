using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class ExpenditureRepository : IExpenditureRepository
    {
        private readonly IExpenditureSqlExecutor _expenditureSqlExecutor;

        public ExpenditureRepository(IExpenditureSqlExecutor expenditureSqlExecutor)
        {
            _expenditureSqlExecutor = expenditureSqlExecutor;
        }

        public async Task AddAsync(Expense expenditure, Guid budgetId)
        {
            if (expenditure.BudgetId != budgetId)
                expenditure.BudgetId = budgetId;
            await _expenditureSqlExecutor.InsertExpenseItemsAsync(expenditure);
        }
    }
}
