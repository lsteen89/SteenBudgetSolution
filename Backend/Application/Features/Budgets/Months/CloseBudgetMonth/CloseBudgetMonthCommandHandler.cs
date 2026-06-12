using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Audit.Models;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Application.Features.Budgets.Months.Shared.CloseWindow;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using Backend.Application.Features.Budgets.Months.Models;

namespace Backend.Application.Features.Budgets.Months.CloseBudgetMonth;

public sealed class CloseBudgetMonthCommandHandler
    : ICommandHandler<CloseBudgetMonthCommand, Result<CloseBudgetMonthResultDto>>
{
    private readonly IBudgetMonthRepository _months;
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDashboardRepository _dashboard;
    private readonly IBudgetMonthMaterializer _materializer;
    private readonly IBudgetMonthCloseSnapshotService _closeSnapshot;
    private readonly IBudgetAuditWriter _audit;
    private readonly IBudgetMonthSavingsGoalMutationRepository _savingsGoals;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly ITimeProvider _clock;

    public CloseBudgetMonthCommandHandler(
        IBudgetMonthRepository months,
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthDashboardRepository dashboard,
        IBudgetMonthMaterializer materializer,
        IBudgetMonthCloseSnapshotService closeSnapshot,
        IBudgetAuditWriter audit,
        IBudgetMonthSavingsGoalMutationRepository savingsGoals,
        IBudgetMonthChangeEventRepository changeEvents,
        ITimeProvider clock)
    {
        _months = months;
        _lifecycle = lifecycle;
        _dashboard = dashboard;
        _materializer = materializer;
        _closeSnapshot = closeSnapshot;
        _audit = audit;
        _savingsGoals = savingsGoals;
        _changeEvents = changeEvents;
        _clock = clock;
    }

    public async Task<Result<CloseBudgetMonthResultDto>> Handle(
        CloseBudgetMonthCommand cmd,
        CancellationToken ct)
    {
        var yearMonthResult = ValidateYearMonth(cmd.YearMonth);
        if (yearMonthResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(yearMonthResult.Error);

        var carryOverModeResult = ValidateCarryOverMode(cmd.Request);
        if (carryOverModeResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(carryOverModeResult.Error);

        var requestedYearMonth = yearMonthResult.Value!;
        var carryOverMode = carryOverModeResult.Value!;

        var budgetId = await GetBudgetIdAsync(cmd.Persoid, ct);
        if (budgetId.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(budgetId.Error);

        var currentMonthResult = await GetAndValidateCurrentMonthAsync(
            budgetId.Value,
            requestedYearMonth,
            ct);

        if (currentMonthResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(currentMonthResult.Error);

        var currentMonth = currentMonthResult.Value!;

        var materializeResult = await EnsureCurrentMonthMaterializedAsync(
            currentMonth,
            cmd.ActorPersoid,
            ct);

        if (materializeResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(materializeResult.Error);

        var closeWindowResult = await EnsureCloseWindowOpenAsync(currentMonth, ct);
        if (closeWindowResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(closeWindowResult.Error);

        var snapshotResult = await ComputeSnapshotAsync(currentMonth, ct);
        if (snapshotResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(snapshotResult.Error);

        var snapshot = snapshotResult.Value!;
        var nowUtc = _clock.UtcNow;

        var closeCurrentMonthResult = await CloseCurrentMonthAsync(
            currentMonth,
            snapshot,
            cmd.ActorPersoid,
            nowUtc,
            ct);

        if (closeCurrentMonthResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(closeCurrentMonthResult.Error);

        // Apply user-selected savings goal completions BEFORE the next month
        // is ensured/materialized: the materializer only pulls active
        // baseline rows, so closing the baseline here keeps a freshly
        // created next month from inheriting a completed goal.
        var selectedCompletionIds = cmd.Request.CompletedSavingsGoalIds
            ?? Array.Empty<Guid>();

        var completionsResult = await CloseMonthSavingsGoalCompletionApplier.ApplyAsync(
            _savingsGoals,
            _changeEvents,
            currentMonth.Id,
            selectedCompletionIds,
            cmd.ActorPersoid,
            nowUtc,
            ct);

        if (completionsResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(completionsResult.Error);

        await WriteLifecycleAsync(
            budgetMonthId: currentMonth.Id,
            eventType: BudgetMonthLifecycleEventTypes.Closed,
            relatedBudgetMonthId: null,
            carryOverMode: null,
            carryOverAmount: null,
            metadataJson: JsonSerializer.Serialize(new
            {
                currentMonth.YearMonth,
                snapshot.TotalIncome,
                snapshot.TotalExpenses,
                snapshot.TotalSavings,
                snapshot.TotalDebtPayments,
                snapshot.FinalBalance
            }),
            actorPersoid: cmd.ActorPersoid,
            occurredAt: nowUtc,
            ct: ct);

        var nextYearMonth = GetNextYearMonth(requestedYearMonth);

        var nextMonthResult = await EnsureAndConfigureNextMonthAsync(
            cmd,
            budgetId.Value,
            currentMonth,
            snapshot,
            nextYearMonth,
            carryOverMode,
            nowUtc,
            ct);

        if (nextMonthResult.IsFailure)
            return Result<CloseBudgetMonthResultDto>.Failure(nextMonthResult.Error);

        var nextMonth = nextMonthResult.Value!;

        var closedMonth = await _months.GetMonthAsync(budgetId.Value, requestedYearMonth, ct);
        if (closedMonth is null)
            return Result<CloseBudgetMonthResultDto>.Failure(BudgetMonth.CloseResultUnavailable);

        return Result<CloseBudgetMonthResultDto>.Success(
            BuildResult(closedMonth, nextMonth, snapshot));
    }

    private static Result<string> ValidateYearMonth(string yearMonth)
    {
        if (!YearMonthUtil.TryParse(yearMonth, out _, out _))
            return Result<string>.Failure(BudgetMonth.InvalidYearMonth);

        return Result<string>.Success(YearMonthUtil.Normalize(yearMonth));
    }

    private static Result<string> ValidateCarryOverMode(CloseBudgetMonthRequestDto request)
    {
        var carryOverMode = request.CarryOverMode?.Trim();

        if (carryOverMode is not (BudgetMonthCarryOverModes.None or BudgetMonthCarryOverModes.Full))
            return Result<string>.Failure(BudgetMonth.InvalidCloseCarryMode);

        return Result<string>.Success(carryOverMode);
    }

    private async Task<Result<Guid>> GetBudgetIdAsync(Guid persoid, CancellationToken ct)
    {
        var budgetId = await _months.GetBudgetIdByPersoidAsync(persoid, ct);
        if (budgetId is null)
            return Result<Guid>.Failure(BudgetMonth.BudgetNotFound);

        return Result<Guid>.Success(budgetId.Value);
    }

    private async Task<Result<BudgetMonthDetailsRm>> GetAndValidateCurrentMonthAsync(
        Guid budgetId,
        string requestedYearMonth,
        CancellationToken ct)
    {
        var currentMonth = await _months.GetMonthAsync(budgetId, requestedYearMonth, ct);
        if (currentMonth is null)
            return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.MonthNotFound);

        if (currentMonth.Status == BudgetMonthStatuses.Closed)
            return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.MonthIsClosed);

        if (currentMonth.Status != BudgetMonthStatuses.Open)
            return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.MonthMustBeOpenToClose);

        return Result<BudgetMonthDetailsRm>.Success(currentMonth);
    }

    private async Task<Result> EnsureCloseWindowOpenAsync(
        BudgetMonthDetailsRm currentMonth,
        CancellationToken ct)
    {
        var currentMonthData = await _dashboard.GetDashboardDataForMonthAsync(currentMonth.Id, ct);
        if (currentMonthData is null)
            return Result.Failure(BudgetMonth.MonthDataUnavailable);

        var closeWindow = BudgetMonthCloseWindowCalculator.Calculate(
            currentMonth.YearMonth,
            currentMonthData.Totals.IncomePaymentDayType,
            currentMonthData.Totals.IncomePaymentDay,
            _clock.UtcNow);

        if (!closeWindow.IsCloseWindowOpen)
            return Result.Failure(BudgetMonth.MonthNotEligibleToClose);

        return Result.Success();
    }

    private async Task<Result<BudgetMonthCloseSnapshot>> ComputeSnapshotAsync(
        BudgetMonthDetailsRm currentMonth,
        CancellationToken ct)
    {
        var snapshot = await _closeSnapshot.ComputeAsync(
            currentMonth.Id,
            currentMonth.CarryOverAmount ?? 0m,
            ct);

        if (snapshot is null)
            return Result<BudgetMonthCloseSnapshot>.Failure(BudgetMonth.MonthDataUnavailable);

        return Result<BudgetMonthCloseSnapshot>.Success(snapshot);
    }

    private async Task<Result> CloseCurrentMonthAsync(
        BudgetMonthDetailsRm currentMonth,
        BudgetMonthCloseSnapshot snapshot,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
    {
        var closedRows = await _months.CloseOpenMonthWithSnapshotAsync(
            budgetMonthId: currentMonth.Id,
            userId: actorPersoid,
            nowUtc: nowUtc,
            totalIncome: snapshot.TotalIncome,
            totalExpenses: snapshot.TotalExpenses,
            totalSavings: snapshot.TotalSavings,
            totalDebtPayments: snapshot.TotalDebtPayments,
            finalBalance: snapshot.FinalBalance,
            ct: ct);

        if (closedRows == 0)
            return Result.Failure(BudgetMonth.MonthMustBeOpenToClose);

        return Result.Success();
    }

    private async Task<Result<BudgetMonthDetailsRm>> EnsureAndConfigureNextMonthAsync(
        CloseBudgetMonthCommand cmd,
        Guid budgetId,
        BudgetMonthDetailsRm currentMonth,
        BudgetMonthCloseSnapshot snapshot,
        string nextYearMonth,
        string carryOverMode,
        DateTime nowUtc,
        CancellationToken ct)
    {
        var existingNextMonth = await _months.GetMonthAsync(budgetId, nextYearMonth, ct);

        if (existingNextMonth is not null
            && existingNextMonth.Status != BudgetMonthStatuses.Open
            && existingNextMonth.Status != BudgetMonthStatuses.Planned)
        {
            return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.NextMonthMustBeOpen);
        }

        if (existingNextMonth is not null && existingNextMonth.Status == BudgetMonthStatuses.Planned)
        {
            // Promote the planned next month instead of creating one. No
            // re-materialization happens here: the planned month rows were
            // materialized at planning time and may carry user edits that
            // must survive promotion. The current month is already closed at
            // this point, so the one-open-month unique key admits the switch.
            var promotedRows = await _months.PromotePlannedMonthToOpenAsync(
                existingNextMonth.Id,
                cmd.ActorPersoid,
                nowUtc,
                ct);

            if (promotedRows == 0)
                return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.PlannedMonthPromotionFailed);

            await WriteLifecycleAsync(
                budgetMonthId: existingNextMonth.Id,
                eventType: BudgetMonthLifecycleEventTypes.PlannedMonthPromoted,
                relatedBudgetMonthId: currentMonth.Id,
                carryOverMode: null,
                carryOverAmount: null,
                metadataJson: JsonSerializer.Serialize(new
                {
                    sourceYearMonth = currentMonth.YearMonth,
                    targetYearMonth = nextYearMonth
                }),
                actorPersoid: cmd.ActorPersoid,
                occurredAt: nowUtc,
                ct: ct);
        }
        else
        {
            var ensuredNext = await _lifecycle.EnsureAccessibleMonthAsync(
                cmd.Persoid,
                cmd.ActorPersoid,
                nextYearMonth,
                ct);

            if (ensuredNext.IsFailure || ensuredNext.Value is null)
                return Result<BudgetMonthDetailsRm>.Failure(ensuredNext.Error);

            if (ensuredNext.Value.WasCreated)
            {
                await WriteLifecycleAsync(
                    budgetMonthId: ensuredNext.Value.BudgetMonthId,
                    eventType: BudgetMonthLifecycleEventTypes.NextMonthCreated,
                    relatedBudgetMonthId: currentMonth.Id,
                    carryOverMode: null,
                    carryOverAmount: null,
                    metadataJson: JsonSerializer.Serialize(new
                    {
                        sourceYearMonth = currentMonth.YearMonth,
                        targetYearMonth = nextYearMonth
                    }),
                    actorPersoid: cmd.ActorPersoid,
                    occurredAt: nowUtc,
                    ct: ct);
            }
        }

        var nextMonth = await _months.GetMonthAsync(budgetId, nextYearMonth, ct);
        if (nextMonth is null)
            return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.NextMonthEnsureFailed);

        if (nextMonth.Status != BudgetMonthStatuses.Open)
            return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.NextMonthMustBeOpen);

        var receivingCarryOverAmount = ResolveReceivingCarryOverAmount(
            carryOverMode,
            snapshot.FinalBalance);

        var updatedCarryOverRows = await _months.UpdateCarryOverSettingsAsync(
            budgetMonthId: nextMonth.Id,
            carryOverMode: carryOverMode,
            carryOverAmount: receivingCarryOverAmount,
            userId: cmd.ActorPersoid,
            nowUtc: nowUtc,
            ct: ct);

        if (updatedCarryOverRows == 0)
            return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.NextMonthCarryOverUpdateFailed);

        if (carryOverMode != BudgetMonthCarryOverModes.None)
        {
            await WriteLifecycleAsync(
                budgetMonthId: nextMonth.Id,
                eventType: BudgetMonthLifecycleEventTypes.CarryOverApplied,
                relatedBudgetMonthId: currentMonth.Id,
                carryOverMode: carryOverMode,
                carryOverAmount: receivingCarryOverAmount,
                metadataJson: JsonSerializer.Serialize(new
                {
                    sourceYearMonth = currentMonth.YearMonth,
                    targetYearMonth = nextYearMonth,
                    snapshot.FinalBalance
                }),
                actorPersoid: cmd.ActorPersoid,
                occurredAt: nowUtc,
                ct: ct);
        }

        var updatedNextMonth = await _months.GetMonthAsync(budgetId, nextYearMonth, ct);
        if (updatedNextMonth is null)
            return Result<BudgetMonthDetailsRm>.Failure(BudgetMonth.CloseResultUnavailable);

        return Result<BudgetMonthDetailsRm>.Success(updatedNextMonth);
    }

    private static decimal? ResolveReceivingCarryOverAmount(
        string carryOverMode,
        decimal sourceFinalBalance)
        => carryOverMode switch
        {
            BudgetMonthCarryOverModes.None => null,
            BudgetMonthCarryOverModes.Full => Math.Max(sourceFinalBalance, 0m),
            _ => null
        };

    private async Task<Result> EnsureCurrentMonthMaterializedAsync(
        BudgetMonthDetailsRm currentMonth,
        Guid actorPersoid,
        CancellationToken ct)
    {
        var materialized = await _materializer.MaterializeIfMissingAsync(
            currentMonth.BudgetId,
            currentMonth.Id,
            actorPersoid,
            ct);

        if (materialized.IsFailure)
            return Result.Failure(materialized.Error);

        return Result.Success();
    }
    private static CloseBudgetMonthResultDto BuildResult(
        BudgetMonthDetailsRm closedMonth,
        BudgetMonthDetailsRm nextMonth,
        BudgetMonthCloseSnapshot snapshot)
    {
        return new CloseBudgetMonthResultDto(
            ClosedMonth: new CloseBudgetMonthClosedMonthDto(
                YearMonth: closedMonth.YearMonth,
                Status: closedMonth.Status,
                ClosedAtUtc: closedMonth.ClosedAt),
            SnapshotTotals: new BudgetMonthSnapshotTotalsDto(
                TotalIncomeMonthly: snapshot.TotalIncome,
                TotalExpensesMonthly: snapshot.TotalExpenses,
                TotalSavingsMonthly: snapshot.TotalSavings,
                TotalDebtPaymentsMonthly: snapshot.TotalDebtPayments,
                FinalBalanceMonthly: snapshot.FinalBalance),
            NextMonth: new CloseBudgetMonthNextMonthDto(
                YearMonth: nextMonth.YearMonth,
                Status: nextMonth.Status,
                CarryOverMode: nextMonth.CarryOverMode,
                CarryOverAmount: nextMonth.CarryOverAmount));
    }

    private static string GetNextYearMonth(string yearMonth)
    {
        var (year, month) = YearMonthUtil.Parse(yearMonth);
        var nextMonth = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
        return nextMonth.ToString("yyyy-MM");
    }

    private Task WriteLifecycleAsync(
        Guid budgetMonthId,
        string eventType,
        Guid? relatedBudgetMonthId,
        string? carryOverMode,
        decimal? carryOverAmount,
        string? metadataJson,
        Guid actorPersoid,
        DateTime occurredAt,
        CancellationToken ct)
        => _audit.WriteLifecycleAsync(
            new BudgetMonthLifecycleEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: budgetMonthId,
                EventType: eventType,
                RelatedBudgetMonthId: relatedBudgetMonthId,
                CarryOverMode: carryOverMode,
                CarryOverAmount: carryOverAmount,
                MetadataJson: metadataJson,
                OccurredAt: occurredAt,
                OccurredByUserId: actorPersoid),
            ct);
}
