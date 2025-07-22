using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Entities.Wizard;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQuries;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class DebtsRepository : IDebtsRepository
    {
        private readonly IDebtsSqlExecutor _debtSqlProvider;

        public DebtsRepository(IDebtsSqlExecutor debtSqlProvider)
        {
            _debtSqlProvider = debtSqlProvider;
        }

        public async Task AddDebtsAsync(IEnumerable<Debt> debts, Guid budgetId)
        {
            foreach(var d in debts)
            {
                // Ensure each expense ID is valid
                if (d.BudgetId == Guid.Empty)
                    d.BudgetId = budgetId;
            }
            await _debtSqlProvider.AddDebtsAsync(debts, budgetId);
        }
    }
}

