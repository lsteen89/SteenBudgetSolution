using Backend.Domain.Entities.Budget;
using Backend.Domain.Interfaces.Repositories;
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

        public async Task AddAsync(Income income, IDbConnection connection, IDbTransaction transaction)
        {
            await _budgetSqlProvider.InsertIncomeAsync(income, connection, transaction);
        }
    }
}
