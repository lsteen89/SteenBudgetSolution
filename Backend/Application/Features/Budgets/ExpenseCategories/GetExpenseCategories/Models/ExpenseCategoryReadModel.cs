namespace Backend.Application.Features.Budgets.ExpenseCategories.GetExpenseCategories.Models;

public sealed record ExpenseCategoryReadModel(
    Guid Id,
    string Name);
