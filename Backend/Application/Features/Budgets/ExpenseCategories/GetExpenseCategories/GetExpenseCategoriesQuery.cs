using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.ExpenseCategories;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.ExpenseCategories.GetExpenseCategories;

public sealed record GetExpenseCategoriesQuery()
    : IQuery<Result<IReadOnlyList<ExpenseCategoryDto>>>;
