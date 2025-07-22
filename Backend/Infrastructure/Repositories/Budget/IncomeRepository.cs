using Backend.Domain.Entities.Budget.Income;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class IncomeRepository : IIncomeRepository
    {
        private readonly IIncomeSqlExecutor _incomeSqlExecutor;

        public IncomeRepository(IIncomeSqlExecutor incomeSqlExecutor)
        {
            _incomeSqlExecutor = incomeSqlExecutor;
        }

        public async Task AddAsync(Income income, Guid budgetId)
        {
            if (income.BudgetId != budgetId)
                income.BudgetId = budgetId;
            await _incomeSqlExecutor.InsertIncomeAndSubItemsAsync(income, budgetId);
        }
    }
}
