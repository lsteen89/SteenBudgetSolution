using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Models.Income;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItemsBulk;

public sealed class PatchBudgetMonthIncomeItemsBulkCommandHandler
    : IRequestHandler<PatchBudgetMonthIncomeItemsBulkCommand, Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthIncomeItemMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthIncomeItemsBulkCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthIncomeItemMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>> Handle(
        PatchBudgetMonthIncomeItemsBulkCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(ensured.Error!);

        var budgetMonthId = ensured.Value.BudgetMonthId;
        var monthMeta = await _repo.GetBudgetMonthMetaAsync(budgetMonthId, ct);
        if (monthMeta is null)
            return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(BudgetMonthIncomeItemErrors.NotFound);

        if (!BudgetMonthEditability.IsEditable(monthMeta.Status))
            return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(BudgetMonth.MonthIsClosed);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var existingRows = new List<(PatchBudgetMonthIncomeItemsBulkCommand.Row CommandRow, BudgetMonthIncomeItemMutationReadModel Existing)>(
            cmd.Items.Count);

        foreach (var row in cmd.Items)
        {
            var existing = await _repo.GetIncomeItemForMutationAsync(
                budgetMonthId,
                row.MonthIncomeItemId,
                ct);

            if (existing is null)
                return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(BudgetMonthIncomeItemErrors.NotFound);

            if (existing.IsDeleted)
                return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(BudgetMonthIncomeItemErrors.RowDeleted);

            var scope = ResolveScope(row.UpdateDefault, row.Scope);
            if (BudgetMonthIncomeEditScopes.WritesBudgetPlan(scope))
            {
                if (existing.SourceIncomeItemId is null)
                    return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(
                        BudgetMonthIncomeItemErrors.CannotUpdatePlanForMonthOnlyRow);

                var baselineExists = await _repo.BaselineIncomeItemExistsAsync(
                    existing.Kind,
                    existing.SourceIncomeItemId.Value,
                    ct);

                if (!baselineExists)
                    return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(
                        BudgetMonthIncomeItemErrors.SourcePlanNotFound);
            }

            existingRows.Add((row, existing));
        }

        var updatedRows = new List<BudgetMonthIncomeItemEditorRowDto>(cmd.Items.Count);

        foreach (var (row, existing) in existingRows)
        {
            var rowResult = await IncomeMutationApplier.ApplyAsync(
                _repo,
                _changeEvents,
                existing,
                budgetMonthId,
                cmd.Persoid,
                now,
                row.Name,
                row.AmountMonthly,
                row.IsActive,
                row.UpdateDefault,
                row.Scope,
                ct);

            if (rowResult.IsFailure || rowResult.Value is null)
                return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(rowResult.Error!);

            updatedRows.Add(rowResult.Value);
        }

        return Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Success(updatedRows);
    }

    private static string ResolveScope(bool updateDefault, string? requestedScope)
    {
        if (!string.IsNullOrWhiteSpace(requestedScope) &&
            BudgetMonthIncomeEditScopes.IsSupported(requestedScope))
        {
            return requestedScope!;
        }

        return updateDefault
            ? BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan
            : BudgetMonthIncomeEditScopes.CurrentMonthOnly;
    }
}
