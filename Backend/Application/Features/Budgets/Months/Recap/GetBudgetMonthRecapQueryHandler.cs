using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Recap;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Application.Features.Budgets.Months.Models;
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
        var previousComparableMonth = previousComparableYearMonth is null
            ? null
            : await _months.GetMonthAsync(budgetId.Value, previousComparableYearMonth, ct);
        var comparisonSummary = BuildComparisonSummary(month, previousComparableMonth);
        var currentCategoryTotals = await _months.GetExpenseCategoryTotalsAsync(month.Id, ct);
        var previousCategoryTotals = previousComparableMonth is null
            ? Array.Empty<BudgetMonthExpenseCategoryTotalRm>()
            : await _months.GetExpenseCategoryTotalsAsync(previousComparableMonth.Id, ct);
        var expenseCategories = BuildExpenseCategoryBreakdown(
            currentCategoryTotals,
            previousCategoryTotals,
            previousComparableMonth is not null);

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
                PreviousComparableYearMonth: comparisonSummary is null ? null : previousComparableYearMonth,
                HasPreviousComparableMonth: comparisonSummary is not null,
                Summary: comparisonSummary),
            ExpenseCategories: expenseCategories));
    }

    private static BudgetMonthRecapComparisonSummaryDto? BuildComparisonSummary(
        BudgetMonthDetailsRm current,
        BudgetMonthDetailsRm? previous)
    {
        if (previous is null ||
            previous.SnapshotTotalIncomeMonthly is null ||
            previous.SnapshotTotalExpensesMonthly is null ||
            previous.SnapshotTotalSavingsMonthly is null ||
            previous.SnapshotTotalDebtPaymentsMonthly is null ||
            previous.SnapshotFinalBalanceMonthly is null)
        {
            return null;
        }

        return new BudgetMonthRecapComparisonSummaryDto(
            Income: BuildMetric(
                current.SnapshotTotalIncomeMonthly!.Value,
                previous.SnapshotTotalIncomeMonthly.Value),
            Expenses: BuildMetric(
                current.SnapshotTotalExpensesMonthly!.Value,
                previous.SnapshotTotalExpensesMonthly.Value),
            Savings: BuildMetric(
                current.SnapshotTotalSavingsMonthly!.Value,
                previous.SnapshotTotalSavingsMonthly.Value),
            DebtPayments: BuildMetric(
                current.SnapshotTotalDebtPaymentsMonthly!.Value,
                previous.SnapshotTotalDebtPaymentsMonthly.Value),
            FinalBalance: BuildMetric(
                current.SnapshotFinalBalanceMonthly!.Value,
                previous.SnapshotFinalBalanceMonthly.Value));
    }

    private static BudgetMonthRecapMetricComparisonDto BuildMetric(decimal current, decimal previous)
    {
        var deltaAmount = current - previous;
        var deltaPercent = previous > 0
            ? deltaAmount / previous * 100m
            : (decimal?)null;

        return new BudgetMonthRecapMetricComparisonDto(
            PreviousValue: previous,
            DeltaAmount: deltaAmount,
            DeltaPercent: deltaPercent);
    }

    private static IReadOnlyList<BudgetMonthRecapExpenseCategoryDto> BuildExpenseCategoryBreakdown(
        IReadOnlyList<BudgetMonthExpenseCategoryTotalRm> currentTotals,
        IReadOnlyList<BudgetMonthExpenseCategoryTotalRm> previousTotals,
        bool hasPreviousComparableMonth)
    {
        var currentByCategory = currentTotals.ToDictionary(x => x.CategoryId);
        var previousByCategory = previousTotals.ToDictionary(x => x.CategoryId);
        var categoryIds = currentByCategory.Keys
            .Union(previousByCategory.Keys)
            .ToArray();

        var rows = categoryIds.Select(categoryId =>
        {
            currentByCategory.TryGetValue(categoryId, out var current);
            previousByCategory.TryGetValue(categoryId, out var previous);

            var currentAmount = current?.TotalMonthlyAmount ?? 0m;
            var previousAmount = hasPreviousComparableMonth
                ? previous?.TotalMonthlyAmount ?? 0m
                : (decimal?)null;
            var deltaAmount = previousAmount is null
                ? (decimal?)null
                : currentAmount - previousAmount.Value;
            var deltaPercent = previousAmount is > 0m && deltaAmount is not null
                ? deltaAmount.Value / previousAmount.Value * 100m
                : (decimal?)null;

            return new BudgetMonthRecapExpenseCategoryDto(
                CategoryId: categoryId.ToString(),
                CategoryName: current?.CategoryName ?? previous?.CategoryName ?? categoryId.ToString(),
                CurrentAmount: currentAmount,
                PreviousAmount: previousAmount,
                DeltaAmount: deltaAmount,
                DeltaPercent: deltaPercent);
        });

        return hasPreviousComparableMonth
            ? rows
                .OrderByDescending(x => Math.Abs(x.DeltaAmount ?? 0m))
                .ThenByDescending(x => x.CurrentAmount)
                .ThenBy(x => x.CategoryName)
                .ToArray()
            : rows
                .OrderByDescending(x => x.CurrentAmount)
                .ThenBy(x => x.CategoryName)
                .ToArray();
    }
}
