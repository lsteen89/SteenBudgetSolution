using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class SavingsRepository : ISavingsRepository
    {
        private readonly IBudgetSqlProvider _budgetSqlProvider;

        public SavingsRepository(IBudgetSqlProvider budgetSqlProvider)
        {
            _budgetSqlProvider = budgetSqlProvider;
        }

        public async Task AddAsync(Savings savings, Guid budgetId)
        {
            if (savings.BudgetId != budgetId)
                savings.BudgetId = budgetId;

            await _budgetSqlProvider.SavingsSqlExecutor.AddSavingsAsync(savings ,budgetId);
        }
    }
}
