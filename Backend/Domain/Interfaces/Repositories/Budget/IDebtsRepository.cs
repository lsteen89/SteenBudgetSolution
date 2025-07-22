using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Domain.Interfaces.Repositories.Budget
{
    public interface IDebtsRepository
    {
        Task AddDebtsAsync(IEnumerable<Debt> debts, Guid budgetId);
    }
}
