using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Entities.Wizard;

namespace Backend.Domain.Interfaces.Repositories.Budget
{
    public interface IBudgetRepository
    {
        Task UpdateRepaymentStrategyAsync(string strat, Guid budgetId); // Method to add payment strategies for debts
    }
}
