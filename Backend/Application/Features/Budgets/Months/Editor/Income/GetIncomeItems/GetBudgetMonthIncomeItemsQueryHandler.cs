using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Months.Editor.Models.Income;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.GetIncomeItems;

public sealed class GetBudgetMonthIncomeItemsQueryHandler
    : IRequestHandler<GetBudgetMonthIncomeItemsQuery, Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthIncomeItemMutationRepository _repo;

    public GetBudgetMonthIncomeItemsQueryHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthIncomeItemMutationRepository repo)
    {
        _lifecycle = lifecycle;
        _repo = repo;
    }

    public async Task<Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>> Handle(
        GetBudgetMonthIncomeItemsQuery query,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            query.Persoid,
            query.Persoid,
            query.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(ensured.Error!);

        var meta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (meta is null)
            return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(BudgetMonth.NotFound);

        var rows = await _repo.GetIncomeItemEditorRowsAsync(
            ensured.Value.BudgetMonthId,
            includeDeleted: true,
            ct);

        return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Success(
            rows.Select(ToDto).ToList());
    }

    private static BudgetMonthIncomeItemEditorRowDto ToDto(BudgetMonthIncomeItemEditorRowReadModel row)
        => new(
            row.Id,
            row.SourceIncomeItemId,
            row.Kind,
            row.Kind == BudgetMonthIncomeItemKinds.Salary
                ? "Net salary"
                : row.Name ?? "",
            row.AmountMonthly,
            row.IsActive,
            row.IsDeleted,
            row.SourceIncomeItemId is null,
            row.SourceIncomeItemId is not null,
            row.SourceName,
            row.SourceAmountMonthly,
            row.SourceIsActive);
}
