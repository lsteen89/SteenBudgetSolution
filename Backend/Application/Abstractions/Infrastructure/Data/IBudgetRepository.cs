
using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Application.Abstractions.Infrastructure.Data
{
    public interface IBudgetRepository
    {
        Task<bool> CreateBudgetAsync(Guid budgetId, Guid persoId, CancellationToken ct = default, RepaymentStrategy? debtRepaymentStrategy = null); // Method to create a new budget
        Task UpdateRepaymentStrategyAsync(RepaymentStrategy strategy, Guid budgetId, CancellationToken ct); // Method to add payment strategies for debts
    }
}
