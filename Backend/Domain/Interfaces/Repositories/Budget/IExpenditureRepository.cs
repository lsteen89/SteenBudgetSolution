using Backend.Domain.Entities.Budget.Expenses;

namespace Backend.Domain.Interfaces.Repositories.Budget
{
    public interface IExpenditureRepository
    {
        Task AddAsync(Expense expenditure, Guid budgetId);
    }
}
