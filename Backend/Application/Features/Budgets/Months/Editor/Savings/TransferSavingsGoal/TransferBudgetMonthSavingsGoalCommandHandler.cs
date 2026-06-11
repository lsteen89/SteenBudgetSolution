using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.TransferSavingsGoal;

/// <summary>
/// V2 "Engångsöverföring" handler. Mirrors the lifecycle / status / row-
/// load gates from <see cref="PatchSavingsGoal.PatchBudgetMonthSavingsGoalCommandHandler"/>
/// then delegates to <see cref="SavingsGoalTransferApplier"/>. Wrapped in
/// the standard <c>ITransactionalCommand</c> so the snapshot + plan
/// writes commit atomically.
///
/// NOT IDEMPOTENT: every successful call adds a signed delta and writes
/// an audit row. The FE debounces the Save button so a single user
/// gesture only fires once; nothing on the BE de-duplicates retries.
/// </summary>
public sealed class TransferBudgetMonthSavingsGoalCommandHandler
    : IRequestHandler<TransferBudgetMonthSavingsGoalCommand, Result<BudgetMonthSavingsGoalEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public TransferBudgetMonthSavingsGoalCommandHandler(
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
        TransferBudgetMonthSavingsGoalCommand cmd,
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

        return await SavingsGoalTransferApplier.ApplyAsync(
            _repo,
            _changeEvents,
            existing,
            ensured.Value.BudgetMonthId,
            cmd.Persoid,
            _timeProvider.GetUtcNow().UtcDateTime,
            cmd.Amount,
            cmd.Direction,
            cmd.Note,
            ct);
    }
}
