
namespace Backend.Application.Abstractions.Infrastructure.Data
{
    public interface IBudgetRepository
    {
        Task UpdateRepaymentStrategyAsync(string strat, Guid budgetId, CancellationToken ct); // Method to add payment strategies for debts
    }
}
