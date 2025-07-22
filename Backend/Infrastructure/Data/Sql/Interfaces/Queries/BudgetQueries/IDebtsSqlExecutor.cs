using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Entities.Wizard;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQuries
{
    public interface IDebtsSqlExecutor
    {
        Task AddDebtsAsync(IEnumerable<Debt> debts, Guid budgetId); // Method to add debts to the database for a specific budget
    }
}
