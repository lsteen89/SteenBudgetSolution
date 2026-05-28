using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;

public sealed class PatchBudgetMonthSavingsGoalCommandHandler
    : IRequestHandler<PatchBudgetMonthSavingsGoalCommand, Result<BudgetMonthSavingsGoalEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthSavingsGoalCommandHandler(
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
        PatchBudgetMonthSavingsGoalCommand cmd,
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

        return await SavingsGoalMutationApplier.ApplyAsync(
            _repo,
            _changeEvents,
            existing,
            ensured.Value.BudgetMonthId,
            cmd.Persoid,
            _timeProvider.GetUtcNow().UtcDateTime,
            cmd.MonthlyContribution,
            cmd.Scope,
            cmd.TargetDate,
            ct);
    }
}
