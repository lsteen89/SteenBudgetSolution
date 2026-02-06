using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using Backend.Domain.Shared;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Domain.Errors.Budget;
using Backend.Application.DTO.Budget.Months;

namespace Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;

public sealed class GetBudgetDashboardMonthQueryHandler
    : IQueryHandler<GetBudgetDashboardMonthQuery, Result<BudgetDashboardMonthDto?>>
{
    private readonly IBudgetMonthRepository _months;
    private readonly IBudgetDashboardRepository _dashRepo;
    private readonly IBudgetDashboardProjector _projector;
    private readonly ITimeProvider _clock;

    public GetBudgetDashboardMonthQueryHandler(
        IBudgetMonthRepository months,
        IBudgetDashboardRepository dashRepo,
        IBudgetDashboardProjector projector,
        ITimeProvider clock)
    {
        _months = months;
        _dashRepo = dashRepo;
        _projector = projector;
        _clock = clock;
    }

    public async Task<Result<BudgetDashboardMonthDto?>> Handle(GetBudgetDashboardMonthQuery q, CancellationToken ct)
    {
        const string currencyCode = "SEK"; // hardcoded for now, extend later

        // Find budget
        var budgetId = await _months.GetBudgetIdByPersoidAsync(q.Persoid, ct);
        if (budgetId is null) return Result<BudgetDashboardMonthDto?>.Success(null);

        var now = _clock.UtcNow;
        var currentYm = YearMonthUtil.CurrentYearMonth(now);

        // Decide target YM
        string targetYm;
        if (!string.IsNullOrWhiteSpace(q.YearMonth))
        {
            if (!YearMonthUtil.TryParse(q.YearMonth!, out _, out _))
                return Result<BudgetDashboardMonthDto?>.Failure(BudgetMonth.InvalidYearMonth);

            targetYm = YearMonthUtil.Normalize(q.YearMonth!);
        }
        else
        {
            var open = (await _months.GetOpenMonthsAsync(budgetId.Value, ct))
                .OrderByDescending(x => x.OpenedAt)
                .FirstOrDefault();

            targetYm = open?.YearMonth ?? currentYm;
        }

        // Load month row (must include snapshot columns)
        var month = await _months.GetMonthAsync(budgetId.Value, targetYm, ct);
        if (month is null)
            return Result<BudgetDashboardMonthDto?>.Failure(BudgetMonth.MonthNotFound);

        var meta = new BudgetMonthMetaDto(
            YearMonth: month.YearMonth,
            Status: month.Status,
            CarryOverMode: month.CarryOverMode,
            CarryOverAmount: month.CarryOverAmount
        );

        if (month.Status == BudgetMonthStatuses.Closed)
        {
            if (month.SnapshotFinalBalanceMonthly is null)
                return Result<BudgetDashboardMonthDto?>.Failure(BudgetMonth.SnapshotMissing);

            var snap = new BudgetMonthSnapshotTotalsDto(
                TotalIncomeMonthly: month.SnapshotTotalIncomeMonthly!.Value,
                TotalExpensesMonthly: month.SnapshotTotalExpensesMonthly!.Value,
                TotalSavingsMonthly: month.SnapshotTotalSavingsMonthly!.Value,
                TotalDebtPaymentsMonthly: month.SnapshotTotalDebtPaymentsMonthly!.Value,
                FinalBalanceMonthly: month.SnapshotFinalBalanceMonthly!.Value
            );

            return Result<BudgetDashboardMonthDto?>.Success(new(meta, currencyCode, null, snap));
        }

        // Open => live dashboard + carryOver affects disposable
        var data = await _dashRepo.GetDashboardDataAsync(q.Persoid, ct);
        if (data is null) return Result<BudgetDashboardMonthDto?>.Success(null);

        var carry = month.CarryOverAmount ?? 0m;
        var live = _projector.Project(data, carry);

        // You ONLY have derived properties in BudgetDashboardDto.
        // So to include carryOver, we must return carry in metadata and FE adds it,
        // OR we introduce explicit fields for "DisposableAfter..." with carry applied.
        //
        // Recommendation: add explicit totals for FE and include carry-applied numbers.
        //
        // For now: we keep live dashboard unchanged and rely on Month.CarryOverAmount.
        // (If you want BE to provide carry-applied disposable, add fields to dto below.)
        return Result<BudgetDashboardMonthDto?>.Success(new BudgetDashboardMonthDto(
            CurrencyCode: currencyCode,
            Month: meta,
            LiveDashboard: live,
            SnapshotTotals: null
        ));
    }
}
