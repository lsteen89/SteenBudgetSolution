using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.ExpenseCategories;
using CategoryRegistry = Backend.Domain.Entities.Budget.Expenses.ExpenseCategories;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.ExpenseCategories.GetExpenseCategories;

public sealed class GetExpenseCategoriesQueryHandler
    : IQueryHandler<GetExpenseCategoriesQuery, Result<IReadOnlyList<ExpenseCategoryDto>>>
{
    private readonly IExpenseCategoryReadRepository _repo;

    public GetExpenseCategoriesQueryHandler(IExpenseCategoryReadRepository repo)
    {
        _repo = repo;
    }

    public async Task<Result<IReadOnlyList<ExpenseCategoryDto>>> Handle(
        GetExpenseCategoriesQuery request,
        CancellationToken ct)
    {
        var rows = await _repo.GetExpenseCategoriesAsync(ct);

        var categories = new List<(ExpenseCategoryDto Dto, int SortOrder)>(rows.Count);

        foreach (var row in rows)
        {
            if (!CategoryRegistry.TryGet(row.Id, out var category))
            {
                return Result<IReadOnlyList<ExpenseCategoryDto>>.Failure(
                    new Error(
                        "EXPENSE_CATEGORY_NOT_REGISTERED",
                        $"Expense category '{row.Id}' is not registered in the domain registry."));
            }

            categories.Add((
                new ExpenseCategoryDto(row.Id, row.Name, category.Code),
                category.SortOrder));
        }

        return Result<IReadOnlyList<ExpenseCategoryDto>>.Success(
            categories
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Dto.Name, StringComparer.OrdinalIgnoreCase)
                .Select(x => x.Dto)
                .ToList());
    }
}
