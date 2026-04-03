using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.DTO.Budget.Months;
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

    public GetBudgetDashboardMonthQueryHandler(
        IBudgetMonthLifecycleService lifecycleService,
        IBudgetMonthRepository months,
        IBudgetMonthDashboardRepository monthDashRepo,
        IUserRepository users,
        IBudgetDashboardProjector projector)
    {
        _lifecycleService = lifecycleService;
        _months = months;
        _monthDashRepo = monthDashRepo;
        _users = users;
        _projector = projector;
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
            CarryOverAmount: month.CarryOverAmount
        );

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

        var data = await _monthDashRepo.GetDashboardDataForMonthAsync(month.Id, ct);
        if (data is null)
            return Result<BudgetDashboardMonthDto?>.Success(null);

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