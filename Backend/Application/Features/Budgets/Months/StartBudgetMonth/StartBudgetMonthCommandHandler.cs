using Backend.Domain.Errors;
using Backend.Domain.Enums;  // for ErrorType if needed
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Domain.Shared;
using Microsoft.Extensions.Logging;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Models;
using Backend.Application.Features.Budgets.Months.Helpers;

namespace Backend.Application.Features.Budgets.Months.StartBudgetMonth;

public sealed class StartBudgetMonthCommandHandler
    : ICommandHandler<StartBudgetMonthCommand, Result<BudgetMonthsStatusDto?>>
{
    private readonly IBudgetMonthRepository _months;
    private readonly IBudgetMonthCloseSnapshotService _closeSnapshot;
    private readonly IBudgetMonthlyTotalsService _totals;
    private readonly ITimeProvider _time;
    private readonly ILogger<StartBudgetMonthCommandHandler> _log;

    public StartBudgetMonthCommandHandler(
        IBudgetMonthRepository months,
        IBudgetMonthCloseSnapshotService closeSnapshot,
        IBudgetMonthlyTotalsService totals,
        ITimeProvider time,
        ILogger<StartBudgetMonthCommandHandler> log)
    {
        _months = months;
        _closeSnapshot = closeSnapshot;
        _totals = totals;
        _time = time;
        _log = log;
    }

    public async Task<Result<BudgetMonthsStatusDto?>> Handle(StartBudgetMonthCommand cmd, CancellationToken ct)
    {
        var req = cmd.Request;

        if (!YearMonthUtil.TryParse(req.TargetYearMonth, out _, out _))
            return Result<BudgetMonthsStatusDto?>.Failure(Errors.BudgetMonth.InvalidYearMonth);

        var targetYm = YearMonthUtil.Normalize(req.TargetYearMonth);

        if (req.CarryOverMode is not (BudgetMonthCarryOverModes.None or BudgetMonthCarryOverModes.Full or BudgetMonthCarryOverModes.Custom))
            return Result<BudgetMonthsStatusDto?>.Failure(Errors.BudgetMonth.InvalidCarryMode);

        if (req.CarryOverMode == BudgetMonthCarryOverModes.None && req.CarryOverAmount != 0m)
            return Result<BudgetMonthsStatusDto?>.Failure(Errors.BudgetMonth.InvalidCarryAmount);

        var budgetId = await _months.GetBudgetIdByPersoidAsync(cmd.Persoid, ct);
        if (budgetId is null) return Result<BudgetMonthsStatusDto?>.Success(null);

        var now = _time.UtcNow;

        var openMonths = await _months.GetOpenMonthsAsync(budgetId.Value, ct);

        if (openMonths.Count > 1)
        {
            var keep = openMonths.OrderByDescending(x => x.OpenedAt).First();

            foreach (var m in openMonths.Where(x => x.Id != keep.Id))
            {
                _log.LogWarning("Multiple open months detected. Marking skipped. MonthId={MonthId} YM={YM}", m.Id, m.YearMonth);
                await _months.MarkMonthSkippedAsync(m.Id, cmd.ActorPersoid, now, ct);
            }

            openMonths = new List<BudgetMonthListRm> { keep };
        }

        var open = openMonths.SingleOrDefault();
        if (open is not null)
        {
            var targetDiff = YearMonthUtil.MonthsBetween(open.YearMonth, targetYm);
            if (targetDiff < 0)
                return Result<BudgetMonthsStatusDto?>.Failure(Errors.BudgetMonth.InvalidTargetMonth);
        }

        if (open is not null && !req.ClosePreviousOpenMonth && open.YearMonth != targetYm)
            return Result<BudgetMonthsStatusDto?>.Failure(Errors.BudgetMonth.OpenMonthExists);

        var existingTarget = await _months.GetMonthAsync(budgetId.Value, targetYm, ct);
        if (existingTarget is not null && existingTarget.Status == BudgetMonthStatuses.Closed)
            return Result<BudgetMonthsStatusDto?>.Failure(Errors.BudgetMonth.MonthIsClosed);

        decimal previousFinalBalance = 0m;

        if (req.ClosePreviousOpenMonth && open is not null && open.YearMonth != targetYm)
        {
            var snap = await _closeSnapshot.ComputeAsync(cmd.Persoid, open.CarryOverAmount ?? 0m, ct);
            if (snap is null) return Result<BudgetMonthsStatusDto?>.Success(null);

            previousFinalBalance = snap.FinalBalance;

            await _months.CloseOpenMonthWithSnapshotAsync(
                budgetMonthId: open.Id,
                userId: cmd.ActorPersoid,
                nowUtc: now,
                totalIncome: snap.TotalIncome,
                totalExpenses: snap.TotalExpenses,
                totalSavings: snap.TotalSavings,
                totalDebtPayments: snap.TotalDebtPayments,
                finalBalance: snap.FinalBalance,
                ct: ct);
        }

        // Create skipped placeholders if target is ahead of the previous open month
        if (req.CreateSkippedMonths && open is not null)
        {
            var diff = YearMonthUtil.MonthsBetween(open.YearMonth, targetYm);
            if (diff > 1)
            {
                foreach (var ym in YearMonthUtil.IntermediateMonths(open.YearMonth, targetYm))
                {
                    await _months.InsertSkippedMonthIdempotentAsync(
                        id: Guid.NewGuid(),
                        budgetId: budgetId.Value,
                        yearMonth: ym,
                        userId: cmd.ActorPersoid,
                        nowUtc: now,
                        ct: ct);
                }
            }
        }

        // Resolve carry
        decimal? carryAmount = req.CarryOverMode switch
        {
            BudgetMonthCarryOverModes.None => null,
            BudgetMonthCarryOverModes.Custom => req.CarryOverAmount,
            BudgetMonthCarryOverModes.Full => previousFinalBalance,
            _ => null
        };

        await _months.InsertOpenMonthIdempotentAsync(
            id: Guid.NewGuid(),
            budgetId: budgetId.Value,
            yearMonth: targetYm,
            carryOverMode: req.CarryOverMode,
            carryOverAmount: carryAmount,
            userId: cmd.ActorPersoid,
            nowUtc: now,
            ct: ct);

        // Return updated status
        var months = await _months.GetMonthsAsync(budgetId.Value, ct);
        var currentYm = YearMonthUtil.CurrentYearMonth(now);

        var open2 = months
            .Where(m => m.Status == BudgetMonthStatuses.Open)
            .OrderByDescending(m => m.OpenedAt)
            .FirstOrDefault();

        var suggested = SuggestAction(months.Count, open2?.YearMonth, currentYm);

        var gapMonths = (open2 is null || open2.YearMonth == currentYm)
            ? 0
            : Math.Max(0, YearMonthUtil.MonthsBetween(open2.YearMonth, currentYm));

        var list = months
            .OrderByDescending(m => m.YearMonth)
            .Select(m => new BudgetMonthListItemDto(m.YearMonth, m.Status, m.OpenedAt, m.ClosedAt))
            .ToList();

        return Result<BudgetMonthsStatusDto?>.Success(new BudgetMonthsStatusDto(
            OpenMonthYearMonth: open2?.YearMonth,
            CurrentYearMonth: currentYm,
            GapMonthsCount: gapMonths,
            Months: list,
            SuggestedAction: suggested
        ));
    }

    private static string SuggestAction(int monthsCount, string? openYm, string currentYm)
    {
        if (monthsCount == 0) return BudgetMonthSuggestedActions.CreateFirstMonth;
        if (openYm is null) return BudgetMonthSuggestedActions.PromptStartCurrent;
        if (openYm != currentYm) return BudgetMonthSuggestedActions.PromptStartCurrent;
        return BudgetMonthSuggestedActions.None;
    }
}
