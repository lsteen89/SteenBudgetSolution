using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Shared.CloseWindow;
using Backend.Application.Helpers.Currency;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;

public sealed class GetBudgetDashboardMonthQueryHandler
    : IQueryHandler<GetBudgetDashboardMonthQuery, Result<BudgetDashboardMonthDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycleService;
    private readonly IBudgetMonthRepository _months;
    private readonly IBudgetMonthDashboardRepository _monthDashRepo;
    private readonly IUserRepository _users;
    private readonly IBudgetDashboardProjector _projector;
    private readonly ITimeProvider _clock;

    public GetBudgetDashboardMonthQueryHandler(
        IBudgetMonthLifecycleService lifecycleService,
        IBudgetMonthRepository months,
        IBudgetMonthDashboardRepository monthDashRepo,
        IUserRepository users,
        IBudgetDashboardProjector projector,
        ITimeProvider clock)
    {
        _lifecycleService = lifecycleService;
        _months = months;
        _monthDashRepo = monthDashRepo;
        _users = users;
        _projector = projector;
        _clock = clock;
    }

    public async Task<Result<BudgetDashboardMonthDto?>> Handle(
        GetBudgetDashboardMonthQuery q,
        CancellationToken ct)
    {
        var prefs = await _users.GetUserPreferencesAsync(q.Persoid, ct);
        var currencyCode = CurrencyHelper.NormalizeCurrencyOrDefault(prefs?.Currency, "SEK");

        var ensured = await _lifecycleService.EnsureAccessibleMonthAsync(
            q.Persoid,
            q.Persoid,
            q.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetDashboardMonthDto?>.Failure(ensured.Error);

        var month = await _months.GetMonthAsync(
            ensured.Value.BudgetId,
            ensured.Value.YearMonth,
            ct);

        if (month is null)
        {
            return Result<BudgetDashboardMonthDto?>.Failure(
                new Error("BudgetMonth.NotFound", "Requested budget month could not be loaded."));
        }

        var meta = new BudgetMonthMetaDto(
            YearMonth: month.YearMonth,
            Status: month.Status,
            CarryOverMode: month.CarryOverMode,
            CarryOverAmount: month.CarryOverAmount,
            IsCloseWindowOpen: false,
            CloseWindowOpensAtUtc: null,
            CloseEligibleAtUtc: null,
            IsOverdueForClose: false
        );

        if (month.Status == BudgetMonthStatuses.Skipped)
        {
            return Result<BudgetDashboardMonthDto?>.Success(new BudgetDashboardMonthDto(
                CurrencyCode: currencyCode,
                Month: meta,
                LiveDashboard: null,
                SnapshotTotals: null
            ));
        }

        if (month.Status == BudgetMonthStatuses.Closed)
        {
            if (month.SnapshotFinalBalanceMonthly is null)
            {
                return Result<BudgetDashboardMonthDto?>.Failure(
                    new Error("BudgetMonth.SnapshotMissing", "Snapshot totals are missing for closed month."));
            }

            var snap = new BudgetMonthSnapshotTotalsDto(
                TotalIncomeMonthly: month.SnapshotTotalIncomeMonthly!.Value,
                TotalExpensesMonthly: month.SnapshotTotalExpensesMonthly!.Value,
                TotalSavingsMonthly: month.SnapshotTotalSavingsMonthly!.Value,
                TotalDebtPaymentsMonthly: month.SnapshotTotalDebtPaymentsMonthly!.Value,
                FinalBalanceMonthly: month.SnapshotFinalBalanceMonthly!.Value
            );

            return Result<BudgetDashboardMonthDto?>.Success(new BudgetDashboardMonthDto(
                CurrencyCode: currencyCode,
                Month: meta,
                LiveDashboard: null,
                SnapshotTotals: snap
            ));
        }

        // Only open months reach here.
        var data = await _monthDashRepo.GetDashboardDataForMonthAsync(month.Id, ct);
        if (data is null)
            return Result<BudgetDashboardMonthDto?>.Success(null);

        var closeWindow = BudgetMonthCloseWindowCalculator.Calculate(
            month.YearMonth,
            data.Totals.IncomePaymentDayType,
            data.Totals.IncomePaymentDay,
            _clock.UtcNow);

        meta = meta with
        {
            IsCloseWindowOpen = closeWindow.IsCloseWindowOpen,
            CloseWindowOpensAtUtc = closeWindow.CloseWindowOpensAtUtc,
            CloseEligibleAtUtc = closeWindow.CloseEligibleAtUtc,
            IsOverdueForClose = closeWindow.IsOverdueForClose
        };

        var carry = month.CarryOverAmount ?? 0m;
        var live = _projector.Project(data, carry);

        return Result<BudgetDashboardMonthDto?>.Success(new BudgetDashboardMonthDto(
            CurrencyCode: currencyCode,
            Month: meta,
            LiveDashboard: live,
            SnapshotTotals: null
        ));
    }
}