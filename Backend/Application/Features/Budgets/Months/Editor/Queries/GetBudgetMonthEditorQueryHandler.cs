using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using MediatR;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.DTO.Budget.Months.Editor;
using Backend.Domain.Errors.Budget;

namespace Backend.Application.Features.Budgets.Months.Editor.Queries;

public sealed class GetBudgetMonthEditorQueryHandler
    : IRequestHandler<GetBudgetMonthEditorQuery, Result<BudgetMonthEditorDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthEditorRepository _repo;

    public GetBudgetMonthEditorQueryHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthEditorRepository repo)
    {
        _lifecycle = lifecycle;
        _repo = repo;
    }

    public async Task<Result<BudgetMonthEditorDto?>> Handle(
        GetBudgetMonthEditorQuery query,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            query.Persoid,
            query.Persoid,
            query.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthEditorDto?>.Failure(ensured.Error!);

        var budgetMonthId = ensured.Value.BudgetMonthId;

        var meta = await _repo.GetMonthMetaAsync(budgetMonthId, ct);
        if (meta is null)
            return Result<BudgetMonthEditorDto?>.Failure(BudgetMonth.BudgetNotFound);

        var rows = await _repo.GetExpenseItemEditorRowsAsync(
            budgetMonthId,
            includeDeleted: true,
            ct);

        return Result<BudgetMonthEditorDto?>.Success(
            new BudgetMonthEditorDto(
                new BudgetMonthEditorMetaDto(
                    meta.BudgetMonthId,
                    meta.YearMonth,
                    meta.Status,
                    string.Equals(meta.Status, "open", StringComparison.OrdinalIgnoreCase),
                    meta.CarryOverAmount,
                    meta.CarryOverMode),
                rows.Select(x => new BudgetMonthExpenseItemEditorRowDto(
                    x.Id,
                    x.SourceExpenseItemId,
                    x.CategoryId,
                    x.Name,
                    x.AmountMonthly,
                    x.IsActive,
                    x.IsDeleted,
                    x.SourceExpenseItemId is null,
                    x.SourceExpenseItemId is not null))
                .ToList()));
    }
}