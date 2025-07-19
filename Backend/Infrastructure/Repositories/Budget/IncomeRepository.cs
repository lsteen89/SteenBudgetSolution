using Backend.Domain.Entities.Budget.Income;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class IncomeRepository : IIncomeRepository
    {
        private readonly IBudgetSqlProvider _budgetSqlProvider;

        public IncomeRepository(IBudgetSqlProvider budgetSqlProvider)
        {
            _budgetSqlProvider = budgetSqlProvider;
        }

        public async Task AddAsync(Income income, Guid budgetId)
        {
            if (income.BudgetId != budgetId)
                income.BudgetId = budgetId;
            await _budgetSqlProvider.IncomeSqlExecutor.InsertIncomeAndSubItemsAsync(income, budgetId);
        }
    }
}
