namespace Backend.Application.DTO.Budget.Months.Recap;

public sealed record BudgetMonthRecapDto(
    BudgetMonthRecapMetaDto Month,
    BudgetMonthRecapSnapshotTotalsDto SnapshotTotals,
    BudgetMonthRecapComparisonMetaDto Comparison);

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
