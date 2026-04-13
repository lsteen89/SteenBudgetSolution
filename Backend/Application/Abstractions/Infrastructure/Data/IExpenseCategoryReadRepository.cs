using Backend.Application.Features.Budgets.ExpenseCategories.GetExpenseCategories.Models;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IExpenseCategoryReadRepository
{
    Task<IReadOnlyList<ExpenseCategoryReadModel>> GetExpenseCategoriesAsync(CancellationToken ct);
}
