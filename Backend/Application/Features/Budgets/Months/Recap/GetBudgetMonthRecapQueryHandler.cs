using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Recap;
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Application.Features.Budgets.Months.Models;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Recap;

public sealed class GetBudgetMonthRecapQueryHandler
    : IQueryHandler<GetBudgetMonthRecapQuery, Result<BudgetMonthRecapDto?>>
{
    private readonly IBudgetMonthRepository _months;
    private readonly IDebtPaymentCalculator _debtPaymentCalculator;

    public GetBudgetMonthRecapQueryHandler(
        IBudgetMonthRepository months,
        IDebtPaymentCalculator debtPaymentCalculator)
    {
        _months = months;
        _debtPaymentCalculator = debtPaymentCalculator;
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
        var currentSubscriptions = await _months.GetSubscriptionsAsync(month.Id, ct);
        var previousSubscriptions = previousComparableMonth is null
            ? Array.Empty<BudgetMonthSubscriptionRm>()
            : await _months.GetSubscriptionsAsync(previousComparableMonth.Id, ct);
        var subscriptionInsight = BuildSubscriptionInsight(
            currentSubscriptions,
            previousSubscriptions,
            previousComparableMonth is not null);
        var currentSavingsGoals = await _months.GetSavingsGoalsAsync(month.Id, ct);
        var previousSavingsGoals = previousComparableMonth is null
            ? Array.Empty<BudgetMonthSavingsGoalRm>()
            : await _months.GetSavingsGoalsAsync(previousComparableMonth.Id, ct);
        var savingsDetail = BuildSavingsDetail(
            month.SnapshotTotalSavingsMonthly.Value,
            currentSavingsGoals,
            previousSavingsGoals,
            previousComparableMonth is not null);
        var currentDebts = await _months.GetDebtsAsync(month.Id, ct);
        var previousDebts = previousComparableMonth is null
            ? Array.Empty<BudgetMonthDebtRm>()
            : await _months.GetDebtsAsync(previousComparableMonth.Id, ct);
        var debtDetail = BuildDebtDetail(
            month.SnapshotTotalDebtPaymentsMonthly.Value,
            currentDebts,
            previousDebts,
            previousComparableMonth is not null);
        var insightDrivers = BuildInsightDrivers(
            expenseCategories,
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
            ExpenseCategories: expenseCategories,
            SubscriptionInsight: subscriptionInsight,
            SavingsDetail: savingsDetail,
            DebtDetail: debtDetail,
            InsightDrivers: insightDrivers));
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

    private const int MaxExpenseIncreaseDrivers = 2;

    private static BudgetMonthRecapInsightDriversDto BuildInsightDrivers(
        IReadOnlyList<BudgetMonthRecapExpenseCategoryDto> expenseCategories,
        bool hasPreviousComparableMonth)
    {
        if (!hasPreviousComparableMonth)
        {
            return new BudgetMonthRecapInsightDriversDto(
                ExpenseIncreaseDrivers: Array.Empty<BudgetMonthRecapExpenseDriverDto>(),
                LargestExpenseIncreaseDriver: null);
        }

        var increaseDrivers = expenseCategories
            .Where(x => x.PreviousAmount is not null &&
                        x.DeltaAmount is > 0m)
            .OrderByDescending(x => x.DeltaAmount!.Value)
            .ThenByDescending(x => x.CurrentAmount)
            .ThenBy(x => x.CategoryName, StringComparer.OrdinalIgnoreCase)
            .Take(MaxExpenseIncreaseDrivers)
            .Select(x => new BudgetMonthRecapExpenseDriverDto(
                CategoryId: x.CategoryId,
                CategoryName: x.CategoryName,
                CurrentAmount: x.CurrentAmount,
                PreviousAmount: x.PreviousAmount!.Value,
                DeltaAmount: x.DeltaAmount!.Value,
                DeltaPercent: x.DeltaPercent))
            .ToArray();

        return new BudgetMonthRecapInsightDriversDto(
            ExpenseIncreaseDrivers: increaseDrivers,
            LargestExpenseIncreaseDriver: increaseDrivers.Length == 0 ? null : increaseDrivers[0]);
    }

    private static BudgetMonthRecapSubscriptionInsightDto BuildSubscriptionInsight(
        IReadOnlyList<BudgetMonthSubscriptionRm> currentSubscriptions,
        IReadOnlyList<BudgetMonthSubscriptionRm> previousSubscriptions,
        bool hasPreviousComparableMonth)
    {
        var currentByIdentity = BuildSubscriptionIdentityMap(currentSubscriptions);
        var currentActiveByIdentity = BuildSubscriptionIdentityMap(
            currentSubscriptions.Where(IsActiveSubscriptionLifecycle));
        var currentPausedByIdentity = BuildSubscriptionIdentityMap(
            currentSubscriptions.Where(x =>
                x.SubscriptionLifecycleStatus == BudgetMonthSubscriptionLifecycleStatuses.Paused));
        var currentCancelledByIdentity = BuildSubscriptionIdentityMap(
            currentSubscriptions.Where(x =>
                x.SubscriptionLifecycleStatus == BudgetMonthSubscriptionLifecycleStatuses.Cancelled));
        var previousByIdentity = BuildSubscriptionIdentityMap(previousSubscriptions);
        var pausedOrCancelledIdentityKeys = currentPausedByIdentity.Keys
            .Union(currentCancelledByIdentity.Keys)
            .ToHashSet(StringComparer.Ordinal);

        if (!hasPreviousComparableMonth)
        {
            return new BudgetMonthRecapSubscriptionInsightDto(
                Active: OrderSubscriptions(currentActiveByIdentity
                    .Where(x => !pausedOrCancelledIdentityKeys.Contains(x.Key))
                    .Select(x => x.Value)),
                New: Array.Empty<BudgetMonthRecapSubscriptionItemDto>(),
                Removed: Array.Empty<BudgetMonthRecapSubscriptionItemDto>(),
                Paused: OrderSubscriptions(currentPausedByIdentity
                    .Where(x => !currentCancelledByIdentity.ContainsKey(x.Key))
                    .Select(x => x.Value)),
                Cancelled: OrderSubscriptions(currentCancelledByIdentity.Values),
                HasPreviousComparableMonth: false);
        }

        var active = currentActiveByIdentity
            .Where(x => previousByIdentity.ContainsKey(x.Key))
            .Where(x => !pausedOrCancelledIdentityKeys.Contains(x.Key))
            .Select(x => x.Value);
        var added = currentActiveByIdentity
            .Where(x => !previousByIdentity.ContainsKey(x.Key))
            .Where(x => !pausedOrCancelledIdentityKeys.Contains(x.Key))
            .Select(x => x.Value);
        var removed = previousByIdentity
            .Where(x => !currentByIdentity.ContainsKey(x.Key))
            .Select(x => x.Value);

        return new BudgetMonthRecapSubscriptionInsightDto(
            Active: OrderSubscriptions(active),
            New: OrderSubscriptions(added),
            Removed: OrderSubscriptions(removed),
            Paused: OrderSubscriptions(currentPausedByIdentity
                .Where(x => !currentCancelledByIdentity.ContainsKey(x.Key))
                .Select(x => x.Value)),
            Cancelled: OrderSubscriptions(currentCancelledByIdentity.Values),
            HasPreviousComparableMonth: true);
    }

    private static Dictionary<string, BudgetMonthRecapSubscriptionItemDto> BuildSubscriptionIdentityMap(
        IEnumerable<BudgetMonthSubscriptionRm> subscriptions)
    {
        return subscriptions
            .Select(x => new
            {
                Key = BuildSubscriptionIdentityKey(x),
                Subscription = x
            })
            .Where(x => x.Key is not null)
            .GroupBy(x => x.Key!)
            .ToDictionary(
                x => x.Key,
                x =>
                {
                    var ordered = x
                        .Select(y => y.Subscription)
                        .OrderBy(y => y.Name, StringComparer.OrdinalIgnoreCase)
                        .ThenBy(y => y.Id)
                        .ToArray();
                    var first = ordered[0];
                    return new BudgetMonthRecapSubscriptionItemDto(
                        IdentityKey: x.Key,
                        Name: first.Name.Trim(),
                        AmountMonthly: ordered.Sum(y => y.AmountMonthly),
                        SourceExpenseItemId: first.SourceExpenseItemId?.ToString());
                });
    }

    private static bool IsActiveSubscriptionLifecycle(BudgetMonthSubscriptionRm subscription)
        => subscription.SubscriptionLifecycleStatus is null ||
           subscription.SubscriptionLifecycleStatus == BudgetMonthSubscriptionLifecycleStatuses.Active;

    private static string? BuildSubscriptionIdentityKey(BudgetMonthSubscriptionRm subscription)
    {
        if (subscription.SourceExpenseItemId is Guid sourceExpenseItemId)
            return $"source:{sourceExpenseItemId:D}";

        var normalizedName = NormalizeSubscriptionName(subscription.Name);
        return normalizedName.Length == 0 ? null : $"name:{normalizedName}";
    }

    private static string NormalizeSubscriptionName(string value)
        => value.Trim().ToUpperInvariant();

    private static BudgetMonthRecapSubscriptionItemDto[] OrderSubscriptions(
        IEnumerable<BudgetMonthRecapSubscriptionItemDto> subscriptions)
        => subscriptions
            .OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(x => x.IdentityKey, StringComparer.Ordinal)
            .ToArray();

    private static BudgetMonthRecapSavingsDetailDto BuildSavingsDetail(
        decimal totalSavingsMonthly,
        IReadOnlyList<BudgetMonthSavingsGoalRm> currentGoals,
        IReadOnlyList<BudgetMonthSavingsGoalRm> previousGoals,
        bool hasPreviousComparableMonth)
    {
        var previousContributionBySource = previousGoals
            .Where(x => x.SourceSavingsGoalId is not null)
            .GroupBy(x => x.SourceSavingsGoalId!.Value)
            .ToDictionary(
                x => x.Key,
                x => x.Sum(y => y.MonthlyContribution));

        var goals = currentGoals
            .Select(goal =>
            {
                var previousContribution = hasPreviousComparableMonth &&
                                           goal.SourceSavingsGoalId is Guid sourceSavingsGoalId &&
                                           previousContributionBySource.TryGetValue(sourceSavingsGoalId, out var amount)
                    ? amount
                    : (decimal?)null;
                var deltaContribution = previousContribution is null
                    ? (decimal?)null
                    : goal.MonthlyContribution - previousContribution.Value;

                return new BudgetMonthRecapSavingsGoalDto(
                    Id: goal.Id.ToString(),
                    SourceSavingsGoalId: goal.SourceSavingsGoalId?.ToString(),
                    Name: goal.Name,
                    MonthlyContribution: goal.MonthlyContribution,
                    TargetAmount: goal.TargetAmount,
                    TargetDate: goal.TargetDate,
                    AmountSaved: goal.AmountSaved,
                    PreviousMonthlyContribution: previousContribution,
                    DeltaMonthlyContribution: deltaContribution);
            })
            .OrderByDescending(x => x.MonthlyContribution)
            .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(x => x.Id, StringComparer.Ordinal)
            .ToArray();

        return new BudgetMonthRecapSavingsDetailDto(
            TotalSavingsMonthly: totalSavingsMonthly,
            ActiveGoals: goals,
            HasPreviousComparableMonth: hasPreviousComparableMonth);
    }

    private BudgetMonthRecapDebtDetailDto BuildDebtDetail(
        decimal totalDebtPaymentsMonthly,
        IReadOnlyList<BudgetMonthDebtRm> currentDebts,
        IReadOnlyList<BudgetMonthDebtRm> previousDebts,
        bool hasPreviousComparableMonth)
    {
        var previousPaymentBySource = previousDebts
            .Where(x => x.SourceDebtId is not null)
            .GroupBy(x => x.SourceDebtId!.Value)
            .ToDictionary(
                x => x.Key,
                x => x.Sum(CalculateMonthlyPayment));

        var debts = currentDebts
            .Select(debt =>
            {
                var monthlyPayment = CalculateMonthlyPayment(debt);
                var previousPayment = hasPreviousComparableMonth &&
                                      debt.SourceDebtId is Guid sourceDebtId &&
                                      previousPaymentBySource.TryGetValue(sourceDebtId, out var amount)
                    ? amount
                    : (decimal?)null;
                var deltaPayment = previousPayment is null
                    ? (decimal?)null
                    : monthlyPayment - previousPayment.Value;

                return new BudgetMonthRecapDebtItemDto(
                    Id: debt.Id.ToString(),
                    SourceDebtId: debt.SourceDebtId?.ToString(),
                    Name: debt.Name,
                    Type: debt.Type,
                    Balance: debt.Balance,
                    Apr: debt.Apr,
                    MonthlyPayment: monthlyPayment,
                    MinPayment: debt.MinPayment,
                    MonthlyFee: debt.MonthlyFee,
                    TermMonths: ToNullableInt(debt.TermMonths),
                    PreviousMonthlyPayment: previousPayment,
                    DeltaMonthlyPayment: deltaPayment);
            })
            .OrderByDescending(x => x.MonthlyPayment)
            .ThenByDescending(x => x.Balance)
            .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(x => x.Id, StringComparer.Ordinal)
            .ToArray();

        return new BudgetMonthRecapDebtDetailDto(
            TotalDebtPaymentsMonthly: totalDebtPaymentsMonthly,
            ActiveDebts: debts,
            HasPreviousComparableMonth: hasPreviousComparableMonth);
    }

    private decimal CalculateMonthlyPayment(BudgetMonthDebtRm debt)
        => _debtPaymentCalculator.CalculateMonthlyPayment(
            new DebtForCalc(
                debt.Type,
                debt.Balance,
                debt.Apr,
                debt.MinPayment,
                debt.MonthlyFee,
                ToNullableInt(debt.TermMonths)));

    private static int? ToNullableInt(long? value)
        => value is null ? null : Convert.ToInt32(value.Value);
}
