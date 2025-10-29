
namespace Backend.Application.Abstractions.Infrastructure.Data
{
    public interface IBudgetRepository
    {
        Task<bool> CreateBudgetAsync(Guid budgetId, Guid persoId, CancellationToken ct = default, string? debtRepaymentStrategy = null); // Method to create a new budget
        Task UpdateRepaymentStrategyAsync(string strat, Guid budgetId, CancellationToken ct); // Method to add payment strategies for debts
    }
}
