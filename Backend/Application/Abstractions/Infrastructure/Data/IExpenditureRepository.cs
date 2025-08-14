using Backend.Domain.Entities.Budget.Expenses;

namespace Backend.Application.Abstractions.Infrastructure.Data
{
    public interface IExpenditureRepository
    {
        Task AddAsync(Expense expenditure, Guid budgetId, CancellationToken ct);
    }
}
