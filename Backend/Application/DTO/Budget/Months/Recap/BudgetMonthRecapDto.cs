namespace Backend.Application.DTO.Budget.Months.Recap;

public sealed record BudgetMonthRecapDto(
    BudgetMonthRecapMetaDto Month,
    BudgetMonthRecapSnapshotTotalsDto SnapshotTotals,
    BudgetMonthRecapComparisonMetaDto Comparison,
    IReadOnlyList<BudgetMonthRecapExpenseCategoryDto> ExpenseCategories,
    BudgetMonthRecapSubscriptionInsightDto SubscriptionInsight,
    BudgetMonthRecapSavingsDetailDto SavingsDetail,
    BudgetMonthRecapDebtDetailDto DebtDetail);

public sealed record BudgetMonthRecapMetaDto(
    string YearMonth,
    string Status,
    DateTime OpenedAtUtc,
    DateTime? ClosedAtUtc,
    string CarryOverMode,
    decimal? CarryOverAmount);

public sealed record BudgetMonthRecapSnapshotTotalsDto(
    decimal TotalIncomeMonthly,
    decimal TotalExpensesMonthly,
    decimal TotalSavingsMonthly,
    decimal TotalDebtPaymentsMonthly,
    decimal FinalBalanceMonthly);

public sealed record BudgetMonthRecapComparisonMetaDto(
    string? PreviousComparableYearMonth,
    bool HasPreviousComparableMonth,
    BudgetMonthRecapComparisonSummaryDto? Summary);

public sealed record BudgetMonthRecapComparisonSummaryDto(
    BudgetMonthRecapMetricComparisonDto Income,
    BudgetMonthRecapMetricComparisonDto Expenses,
    BudgetMonthRecapMetricComparisonDto Savings,
    BudgetMonthRecapMetricComparisonDto DebtPayments,
    BudgetMonthRecapMetricComparisonDto FinalBalance);

public sealed record BudgetMonthRecapMetricComparisonDto(
    decimal PreviousValue,
    decimal DeltaAmount,
    decimal? DeltaPercent);

public sealed record BudgetMonthRecapExpenseCategoryDto(
    string CategoryId,
    string CategoryName,
    decimal CurrentAmount,
    decimal? PreviousAmount,
    decimal? DeltaAmount,
    decimal? DeltaPercent);

public sealed record BudgetMonthRecapSubscriptionInsightDto(
    IReadOnlyList<BudgetMonthRecapSubscriptionItemDto> Active,
    IReadOnlyList<BudgetMonthRecapSubscriptionItemDto> New,
    IReadOnlyList<BudgetMonthRecapSubscriptionItemDto> Removed,
    IReadOnlyList<BudgetMonthRecapSubscriptionItemDto> Paused,
    IReadOnlyList<BudgetMonthRecapSubscriptionItemDto> Cancelled,
    bool HasPreviousComparableMonth);

public sealed record BudgetMonthRecapSubscriptionItemDto(
    string IdentityKey,
    string Name,
    decimal AmountMonthly,
    string? SourceExpenseItemId);

public sealed record BudgetMonthRecapSavingsDetailDto(
    decimal TotalSavingsMonthly,
    IReadOnlyList<BudgetMonthRecapSavingsGoalDto> ActiveGoals,
    bool HasPreviousComparableMonth);

public sealed record BudgetMonthRecapSavingsGoalDto(
    string Id,
    string? SourceSavingsGoalId,
    string? Name,
    decimal MonthlyContribution,
    decimal? TargetAmount,
    DateTime? TargetDate,
    decimal? AmountSaved,
    decimal? PreviousMonthlyContribution,
    decimal? DeltaMonthlyContribution);

public sealed record BudgetMonthRecapDebtDetailDto(
    decimal TotalDebtPaymentsMonthly,
    IReadOnlyList<BudgetMonthRecapDebtItemDto> ActiveDebts,
    bool HasPreviousComparableMonth);

public sealed record BudgetMonthRecapDebtItemDto(
    string Id,
    string? SourceDebtId,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal MonthlyPayment,
    decimal? MinPayment,
    decimal? MonthlyFee,
    int? TermMonths,
    decimal? PreviousMonthlyPayment,
    decimal? DeltaMonthlyPayment);
