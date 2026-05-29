using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.ExpenseCategories;
using CategoryRegistry = Backend.Domain.Entities.Budget.Expenses.ExpenseCategories;
using Backend.Domain.Shared;
using Microsoft.Extensions.Logging;

namespace Backend.Application.Features.Budgets.ExpenseCategories.GetExpenseCategories;

public sealed class GetExpenseCategoriesQueryHandler
    : IQueryHandler<GetExpenseCategoriesQuery, Result<IReadOnlyList<ExpenseCategoryDto>>>
{
    private readonly IExpenseCategoryReadRepository _repo;
    private readonly ILogger<GetExpenseCategoriesQueryHandler> _logger;

    public GetExpenseCategoriesQueryHandler(
        IExpenseCategoryReadRepository repo,
        ILogger<GetExpenseCategoriesQueryHandler> logger)
    {
        _repo = repo;
        _logger = logger;
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
                // The ExpenseCategory table can carry rows the domain registry
                // does not own (notably the recap-sankey-stress E2E profile
                // seeds two synthetic test categories into the global table).
                // Aborting the whole list when one row is unknown made the
                // expense editor unusable across all users on any environment
                // where those rows existed. Skip the unknown row with a
                // warning instead — the registered rows still load and the
                // unregistered row simply does not appear in the picker.
                _logger.LogWarning(
                    "Expense category {ExpenseCategoryId} ('{Name}') is not registered in the domain registry; skipping it in the categories list.",
                    row.Id,
                    row.Name);
                continue;
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
