using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoalsBulk;

public sealed class PatchBudgetMonthSavingsGoalsBulkCommandHandler
    : IRequestHandler<PatchBudgetMonthSavingsGoalsBulkCommand, Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthSavingsGoalsBulkCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>> Handle(
        PatchBudgetMonthSavingsGoalsBulkCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(ensured.Error!);

        var budgetMonthId = ensured.Value.BudgetMonthId;
        var monthMeta = await _repo.GetBudgetMonthMetaAsync(budgetMonthId, ct);
        if (monthMeta is null)
            return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(BudgetMonthSavingsGoalErrors.NotFound);

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(BudgetMonth.MonthIsClosed);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var existingRows = new List<(PatchBudgetMonthSavingsGoalsBulkCommand.Row CommandRow, BudgetMonthSavingsGoalMutationReadModel Existing)>(
            cmd.Items.Count);

        foreach (var row in cmd.Items)
        {
            var existing = await _repo.GetSavingsGoalForMutationAsync(
                budgetMonthId,
                row.MonthSavingsGoalId,
                ct);

            if (existing is null)
                return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(BudgetMonthSavingsGoalErrors.NotFound);

            if (existing.IsDeleted)
                return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(BudgetMonthSavingsGoalErrors.RowDeleted);

            if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
                return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(BudgetMonthSavingsGoalErrors.RowClosed);

            var scope = ResolveScope(row.Scope);
            if (BudgetMonthSavingsGoalEditScopes.WritesBudgetPlan(scope))
            {
                if (existing.SourceSavingsGoalId is null)
                    return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(
                        BudgetMonthSavingsGoalErrors.CannotUpdatePlanForMonthOnlyRow);

                var baselineExists = await _repo.BaselineSavingsGoalExistsAsync(
                    existing.SourceSavingsGoalId.Value,
                    ct);

                if (!baselineExists)
                    return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(
                        BudgetMonthSavingsGoalErrors.SourcePlanNotFound);
            }

            existingRows.Add((row, existing));
        }

        var updatedRows = new List<BudgetMonthSavingsGoalEditorRowDto>(cmd.Items.Count);

        foreach (var (row, existing) in existingRows)
        {
            var rowResult = await SavingsGoalMutationApplier.ApplyAsync(
                _repo,
                _changeEvents,
                existing,
                budgetMonthId,
                cmd.Persoid,
                now,
                row.MonthlyContribution,
                row.Scope,
                requestedTargetDate: null,
                ct);

            if (rowResult.IsFailure || rowResult.Value is null)
                return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(rowResult.Error!);

            updatedRows.Add(rowResult.Value);
        }

        return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Success(updatedRows);
    }

    private static string ResolveScope(string? requestedScope)
    {
        if (!string.IsNullOrWhiteSpace(requestedScope) &&
            BudgetMonthSavingsGoalEditScopes.IsSupported(requestedScope))
        {
            return requestedScope!;
        }

        return BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly;
    }
}
