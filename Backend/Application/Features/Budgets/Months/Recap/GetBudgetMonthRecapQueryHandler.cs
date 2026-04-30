using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Recap;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Recap;

public sealed class GetBudgetMonthRecapQueryHandler
    : IQueryHandler<GetBudgetMonthRecapQuery, Result<BudgetMonthRecapDto?>>
{
    private readonly IBudgetMonthRepository _months;

    public GetBudgetMonthRecapQueryHandler(IBudgetMonthRepository months)
    {
        _months = months;
    }

    public async Task<Result<BudgetMonthRecapDto?>> Handle(
        GetBudgetMonthRecapQuery query,
        CancellationToken ct)
    {
        if (!YearMonthUtil.IsValid(query.YearMonth))
            return Result<BudgetMonthRecapDto?>.Failure(BudgetMonth.InvalidYearMonth);

        var yearMonth = YearMonthUtil.Normalize(query.YearMonth);
        var budgetId = await _months.GetBudgetIdByPersoidAsync(query.Persoid, ct);
        if (budgetId is null)
            return Result<BudgetMonthRecapDto?>.Failure(BudgetMonth.BudgetNotFound);

        var month = await _months.GetMonthAsync(budgetId.Value, yearMonth, ct);
        if (month is null)
            return Result<BudgetMonthRecapDto?>.Failure(BudgetMonth.MonthNotFound);

        if (month.Status != BudgetMonthStatuses.Closed)
            return Result<BudgetMonthRecapDto?>.Failure(BudgetMonth.RecapRequiresClosedMonth);

        if (month.SnapshotTotalIncomeMonthly is null ||
            month.SnapshotTotalExpensesMonthly is null ||
            month.SnapshotTotalSavingsMonthly is null ||
            month.SnapshotTotalDebtPaymentsMonthly is null ||
            month.SnapshotFinalBalanceMonthly is null)
        {
            return Result<BudgetMonthRecapDto?>.Failure(BudgetMonth.SnapshotMissing);
        }

        var previousComparableYearMonth = await _months.GetPreviousComparableYearMonthAsync(
            budgetId.Value,
            month.YearMonth,
            ct);

        return Result<BudgetMonthRecapDto?>.Success(new BudgetMonthRecapDto(
            Month: new BudgetMonthRecapMetaDto(
                YearMonth: month.YearMonth,
                Status: month.Status,
                OpenedAtUtc: month.OpenedAt,
                ClosedAtUtc: month.ClosedAt,
                CarryOverMode: month.CarryOverMode,
                CarryOverAmount: month.CarryOverAmount),
            SnapshotTotals: new BudgetMonthRecapSnapshotTotalsDto(
                TotalIncomeMonthly: month.SnapshotTotalIncomeMonthly.Value,
                TotalExpensesMonthly: month.SnapshotTotalExpensesMonthly.Value,
                TotalSavingsMonthly: month.SnapshotTotalSavingsMonthly.Value,
                TotalDebtPaymentsMonthly: month.SnapshotTotalDebtPaymentsMonthly.Value,
                FinalBalanceMonthly: month.SnapshotFinalBalanceMonthly.Value),
            Comparison: new BudgetMonthRecapComparisonMetaDto(
                PreviousComparableYearMonth: previousComparableYearMonth,
                HasPreviousComparableMonth: previousComparableYearMonth is not null)));
    }
}
