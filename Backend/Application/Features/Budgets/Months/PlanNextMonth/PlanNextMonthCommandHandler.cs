using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Audit.Models;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.PlanNextMonth;

// Creates the planned (pre-opened) next month from the budget plan.
//
// Invariants enforced here and by the database:
// - the from-month must be the currently open month;
// - the planned month is always the immediate next month (derived, never
//   client-chosen);
// - at most one planned month per budget (UX_BudgetMonth_OnePlannedPerBudget);
// - the open month stays open — planning never closes or mutates it;
// - re-running the command for the same from-month is idempotent.
//
// The planned month is materialized from budget-plan rows once, at creation.
// Later plan edits do not re-sync it: from this point on the planned month
// rows are real month rows the user can edit ahead of time (PR 6/7), and the
// close flow promotes them to open with the final carry-over applied.
public sealed class PlanNextMonthCommandHandler
    : ICommandHandler<PlanNextMonthCommand, Result<PlanNextMonthResultDto>>
{
    private readonly IBudgetMonthRepository _months;
    private readonly IBudgetMonthMaterializer _materializer;
    private readonly IBudgetAuditWriter _audit;
    private readonly ITimeProvider _clock;

    public PlanNextMonthCommandHandler(
        IBudgetMonthRepository months,
        IBudgetMonthMaterializer materializer,
        IBudgetAuditWriter audit,
        ITimeProvider clock)
    {
        _months = months;
        _materializer = materializer;
        _audit = audit;
        _clock = clock;
    }

    public async Task<Result<PlanNextMonthResultDto>> Handle(
        PlanNextMonthCommand cmd,
        CancellationToken ct)
    {
        if (!YearMonthUtil.TryParse(cmd.FromYearMonth, out _, out _))
            return Result<PlanNextMonthResultDto>.Failure(BudgetMonth.InvalidYearMonth);

        var fromYearMonth = YearMonthUtil.Normalize(cmd.FromYearMonth);

        var budgetId = await _months.GetBudgetIdByPersoidAsync(cmd.Persoid, ct);
        if (budgetId is null)
            return Result<PlanNextMonthResultDto>.Failure(BudgetMonth.BudgetNotFound);

        var fromMonth = await _months.GetMonthAsync(budgetId.Value, fromYearMonth, ct);
        if (fromMonth is null || fromMonth.Status != BudgetMonthStatuses.Open)
            return Result<PlanNextMonthResultDto>.Failure(BudgetMonth.PlannedMonthRequiresOpenFromMonth);

        var plannedYearMonth = YearMonthUtil.AddMonths(fromYearMonth, 1);

        var plannedMonths = await _months.GetPlannedMonthsAsync(budgetId.Value, ct);
        var existingPlanned = plannedMonths.FirstOrDefault();

        if (existingPlanned is not null)
        {
            if (existingPlanned.YearMonth == plannedYearMonth)
            {
                return Result<PlanNextMonthResultDto>.Success(new PlanNextMonthResultDto(
                    FromYearMonth: fromYearMonth,
                    PlannedYearMonth: plannedYearMonth,
                    Status: BudgetMonthStatuses.Planned,
                    WasCreated: false));
            }

            return Result<PlanNextMonthResultDto>.Failure(BudgetMonth.PlannedMonthAlreadyExists);
        }

        var existingTarget = await _months.GetByBudgetIdAndYearMonthAsync(budgetId.Value, plannedYearMonth, ct);
        if (existingTarget is not null)
            return Result<PlanNextMonthResultDto>.Failure(BudgetMonth.PlannedNextMonthUnavailable);

        var nowUtc = _clock.UtcNow;
        var plannedMonthId = Guid.NewGuid();

        await _months.InsertPlannedMonthIdempotentAsync(
            id: plannedMonthId,
            budgetId: budgetId.Value,
            yearMonth: plannedYearMonth,
            userId: cmd.ActorPersoid,
            nowUtc: nowUtc,
            ct: ct);

        var planned = await _months.GetByBudgetIdAndYearMonthAsync(budgetId.Value, plannedYearMonth, ct);
        if (planned is null)
            return Result<PlanNextMonthResultDto>.Failure(BudgetMonth.PlannedNextMonthUnavailable);

        var materialized = await _materializer.MaterializeIfMissingAsync(
            budgetId.Value,
            planned.Id,
            cmd.ActorPersoid,
            ct);

        if (materialized.IsFailure)
            return Result<PlanNextMonthResultDto>.Failure(materialized.Error);

        await _audit.WriteLifecycleAsync(
            new BudgetMonthLifecycleEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: planned.Id,
                EventType: BudgetMonthLifecycleEventTypes.PlannedMonthCreated,
                RelatedBudgetMonthId: fromMonth.Id,
                CarryOverMode: null,
                CarryOverAmount: null,
                MetadataJson: JsonSerializer.Serialize(new
                {
                    sourceYearMonth = fromYearMonth,
                    targetYearMonth = plannedYearMonth
                }),
                OccurredAt: nowUtc,
                OccurredByUserId: cmd.ActorPersoid),
            ct);

        return Result<PlanNextMonthResultDto>.Success(new PlanNextMonthResultDto(
            FromYearMonth: fromYearMonth,
            PlannedYearMonth: plannedYearMonth,
            Status: BudgetMonthStatuses.Planned,
            WasCreated: true));
    }
}
