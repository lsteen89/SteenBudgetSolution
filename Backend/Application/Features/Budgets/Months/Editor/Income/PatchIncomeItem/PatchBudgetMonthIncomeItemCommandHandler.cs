using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Income;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;

public sealed class PatchBudgetMonthIncomeItemCommandHandler
    : IRequestHandler<PatchBudgetMonthIncomeItemCommand, Result<BudgetMonthIncomeItemEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthIncomeItemMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthIncomeItemCommandHandler(
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

    public async Task<Result<BudgetMonthIncomeItemEditorRowDto?>> Handle(
        PatchBudgetMonthIncomeItemCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonthIncomeItemErrors.NotFound);

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetIncomeItemForMutationAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthIncomeItemId,
            ct);

        if (existing is null)
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonthIncomeItemErrors.NotFound);

        if (existing.IsDeleted)
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonthIncomeItemErrors.RowDeleted);

        var rowResult = await IncomeMutationApplier.ApplyAsync(
            _repo,
            _changeEvents,
            existing,
            ensured.Value.BudgetMonthId,
            cmd.Persoid,
            _timeProvider.GetUtcNow().UtcDateTime,
            cmd.Name,
            cmd.AmountMonthly,
            cmd.IsActive,
            cmd.UpdateDefault,
            cmd.Scope,
            ct);

        return rowResult;
    }
}

