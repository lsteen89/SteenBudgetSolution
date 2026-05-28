using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.ChangeSavingsGoalTargetAmount;

/// <summary>
/// V2 "Ändra målbelopp" handler. Mirrors the lifecycle / status / row-load
/// gates from <see cref="PatchSavingsGoal.PatchBudgetMonthSavingsGoalCommandHandler"/>
/// then delegates to <see cref="SavingsGoalTargetAmountApplier"/>. Wrapped
/// in the standard <c>ITransactionalCommand</c> so the snapshot + plan +
/// linked-month writes commit atomically.
///
/// The "new target must not fall below the amount already saved" rule lives
/// here, not in the validator, because it depends on the loaded row.
/// </summary>
public sealed class ChangeBudgetMonthSavingsGoalTargetAmountCommandHandler
    : IRequestHandler<ChangeBudgetMonthSavingsGoalTargetAmountCommand, Result<BudgetMonthSavingsGoalEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public ChangeBudgetMonthSavingsGoalTargetAmountCommandHandler(
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

    public async Task<Result<BudgetMonthSavingsGoalEditorRowDto?>> Handle(
        ChangeBudgetMonthSavingsGoalTargetAmountCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonthSavingsGoalErrors.NotFound);

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetSavingsGoalForMutationAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthSavingsGoalId,
            ct);

        if (existing is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonthSavingsGoalErrors.NotFound);

        if (existing.IsDeleted)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonthSavingsGoalErrors.RowDeleted);

        if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonthSavingsGoalErrors.RowClosed);

        // The new target cannot land below the user's existing saved amount.
        // The FE blocks this inline so a round-trip here only happens for a
        // stale client. AmountSaved is nullable in the read model — treat
        // null as zero so a freshly created goal still validates.
        var alreadySaved = existing.AmountSaved ?? 0m;
        if (cmd.TargetAmount < alreadySaved)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                BudgetMonthSavingsGoalErrors.TargetBelowSaved);

        return await SavingsGoalTargetAmountApplier.ApplyAsync(
            _repo,
            _changeEvents,
            existing,
            ensured.Value.BudgetMonthId,
            cmd.Persoid,
            _timeProvider.GetUtcNow().UtcDateTime,
            cmd.TargetAmount,
            ct);
    }
}
