using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.RenameSavingsGoal;

/// <summary>
/// V2 goal rename. Mirrors the lifecycle / status / row-load gates from
/// <see cref="PatchSavingsGoal.PatchBudgetMonthSavingsGoalCommandHandler"/>
/// then delegates to <see cref="SavingsGoalRenameApplier"/>. Wrapped in
/// the standard <c>ITransactionalCommand</c> so the snapshot + plan +
/// linked-month writes commit atomically.
/// </summary>
public sealed class RenameBudgetMonthSavingsGoalCommandHandler
    : IRequestHandler<RenameBudgetMonthSavingsGoalCommand, Result<BudgetMonthSavingsGoalEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public RenameBudgetMonthSavingsGoalCommandHandler(
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
        RenameBudgetMonthSavingsGoalCommand cmd,
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

        if (!BudgetMonthEditability.IsEditable(monthMeta.Status))
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

        // Validator already ruled out empty / overlong strings; the trim
        // here normalises trailing whitespace before we compare against the
        // stored value so a pure-whitespace edit is recognised as a no-op.
        var trimmedName = cmd.Name.Trim();

        return await SavingsGoalRenameApplier.ApplyAsync(
            _repo,
            _changeEvents,
            existing,
            ensured.Value.BudgetMonthId,
            cmd.Persoid,
            _timeProvider.GetUtcNow().UtcDateTime,
            trimmedName,
            ct);
    }
}
