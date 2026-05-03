namespace Backend.Application.Features.Budgets.Months.Models;

public sealed record BudgetMonthDetailsRm(
    Guid Id,
    Guid BudgetId,
    string YearMonth,
    string Status,
    DateTime OpenedAt,
    DateTime? ClosedAt,
    string CarryOverMode,
    decimal? CarryOverAmount,

    decimal? SnapshotTotalIncomeMonthly,
    decimal? SnapshotTotalExpensesMonthly,
    decimal? SnapshotTotalSavingsMonthly,
    decimal? SnapshotTotalDebtPaymentsMonthly,
    decimal? SnapshotFinalBalanceMonthly
);

public sealed record BudgetMonthExpenseCategoryTotalRm(
    Guid CategoryId,
    string CategoryName,
    decimal TotalMonthlyAmount);

public sealed record BudgetMonthSubscriptionRm(
    Guid Id,
    Guid? SourceExpenseItemId,
    string Name,
    decimal AmountMonthly,
    string? SubscriptionLifecycleStatus);
