using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;
using Backend.Infrastructure.Data.Sql.Queries.Budget;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class SavingsRepository : ISavingsRepository
    {
        private readonly ISavingsSqlExecutor _savingsSqlExecutor;

        public SavingsRepository(ISavingsSqlExecutor savingsSqlExecutorr)
        {
            _savingsSqlExecutor = savingsSqlExecutorr;
        }

        public async Task AddAsync(Savings savings, Guid budgetId)
        {
            if (savings.BudgetId != budgetId)
                savings.BudgetId = budgetId;

            await _savingsSqlExecutor.AddSavingsAsync(savings ,budgetId);
        }
    }
}
