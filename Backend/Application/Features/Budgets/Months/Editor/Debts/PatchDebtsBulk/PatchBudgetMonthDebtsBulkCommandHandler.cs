using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtsBulk;

public sealed class PatchBudgetMonthDebtsBulkCommandHandler
    : IRequestHandler<PatchBudgetMonthDebtsBulkCommand, Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthDebtsBulkCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthDebtMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>> Handle(
        PatchBudgetMonthDebtsBulkCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(ensured.Error!);

        var budgetMonthId = ensured.Value.BudgetMonthId;
        var monthMeta = await _repo.GetBudgetMonthMetaAsync(budgetMonthId, ct);
        if (monthMeta is null)
            return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(BudgetMonthDebtErrors.NotFound);

        if (!BudgetMonthEditability.IsEditable(monthMeta.Status))
            return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(BudgetMonth.MonthIsClosed);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var existingRows = new List<(PatchBudgetMonthDebtsBulkCommand.Row CommandRow, BudgetMonthDebtMutationReadModel Existing)>(
            cmd.Items.Count);

        foreach (var row in cmd.Items)
        {
            var existing = await _repo.GetDebtForMutationAsync(
                budgetMonthId,
                row.MonthDebtId,
                ct);

            if (existing is null)
                return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(BudgetMonthDebtErrors.NotFound);

            // PR 1.5: shared with the single-row handler so bulk and single
            // reject the same lifecycle / participation states. Returning here
            // before any mutation runs preserves the bulk all-or-nothing
            // contract — `DebtMutationApplier` is only invoked in the second
            // loop, after every row has cleared the guard.
            var mutability = DebtMutationGuard.EnsureMutable(existing);
            if (mutability.IsFailure)
                return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(mutability.Error!);

            var scope = ResolveScope(row.Scope);
            if (BudgetMonthDebtEditScopes.WritesBudgetPlan(scope))
            {
                if (existing.SourceDebtId is null)
                    return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(
                        BudgetMonthDebtErrors.CannotUpdatePlanForMonthOnlyRow);

                var baselineExists = await _repo.BaselineDebtExistsAsync(
                    existing.SourceDebtId.Value,
                    ct);

                if (!baselineExists)
                    return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(
                        BudgetMonthDebtErrors.SourcePlanNotFound);
            }

            existingRows.Add((row, existing));
        }

        var updatedRows = new List<BudgetMonthDebtEditorRowDto>(cmd.Items.Count);

        foreach (var (row, existing) in existingRows)
        {
            var rowResult = await DebtMutationApplier.ApplyAsync(
                _repo,
                _changeEvents,
                existing,
                budgetMonthId,
                cmd.Persoid,
                now,
                row.MonthlyPayment,
                row.Scope,
                ct);

            if (rowResult.IsFailure || rowResult.Value is null)
                return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(rowResult.Error!);

            updatedRows.Add(rowResult.Value);
        }

        return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Success(updatedRows);
    }

    private static string ResolveScope(string? requestedScope)
    {
        if (!string.IsNullOrWhiteSpace(requestedScope) &&
            BudgetMonthDebtEditScopes.IsSupported(requestedScope))
        {
            return requestedScope!;
        }

        return BudgetMonthDebtEditScopes.CurrentMonthOnly;
    }
}
