using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;

public sealed class PatchBudgetMonthDebtCommandHandler
    : IRequestHandler<PatchBudgetMonthDebtCommand, Result<BudgetMonthDebtEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthDebtCommandHandler(
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

    public async Task<Result<BudgetMonthDebtEditorRowDto?>> Handle(
        PatchBudgetMonthDebtCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(BudgetMonthDebtErrors.NotFound);

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetDebtForMutationAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthDebtId,
            ct);

        if (existing is null)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(BudgetMonthDebtErrors.NotFound);

        if (existing.IsDeleted)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(BudgetMonthDebtErrors.RowDeleted);

        if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(BudgetMonthDebtErrors.RowClosed);

        return await DebtMutationApplier.ApplyAsync(
            _repo,
            _changeEvents,
            existing,
            ensured.Value.BudgetMonthId,
            cmd.Persoid,
            _timeProvider.GetUtcNow().UtcDateTime,
            cmd.MonthlyPayment,
            cmd.Scope,
            ct);
    }
}
