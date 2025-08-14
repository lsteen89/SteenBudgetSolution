using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Application.Abstractions.Infrastructure.Data
{
    public interface IDebtsRepository
    {
        Task AddDebtsAsync(IEnumerable<Debt> debts, Guid budgetId, CancellationToken ct);
    }
}
