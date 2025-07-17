using Backend.Domain.Entities.Budget.Expenditure;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class ExpenditureRepository : IExpenditureRepository
    {
        private readonly IBudgetSqlProvider _budgetSqlProvider;

        public ExpenditureRepository(IBudgetSqlProvider budgetSqlProvider)
        {
            _budgetSqlProvider = budgetSqlProvider;
        }

        public async Task AddAsync(Expenditure expenditure, Guid budgetId)
        {
            await _budgetSqlProvider.ExpenditureSqlExecutor.InsertExpenditureAsync(expenditure, budgetId);
        }
    }
}
