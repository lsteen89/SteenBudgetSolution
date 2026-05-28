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

public sealed record BudgetMonthSavingsGoalRm(
    Guid Id,
    Guid? SourceSavingsGoalId,
    string? Name,
    decimal? TargetAmount,
    DateTime? TargetDate,
    decimal? AmountSaved,
    decimal MonthlyContribution);

public sealed record BudgetMonthDebtRm(
    Guid Id,
    Guid? SourceDebtId,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    long? TermMonths,
    decimal MonthlyPayment);

// Goal that was finished off as part of closing a month. Sourced from the
// month's BudgetMonthSavingsGoal rows where Status='closed' AND
// ClosedReason='completed'. Used by the closed-month recap to surface
// "these goals reached the finish line" without exposing baseline state.
public sealed record BudgetMonthCompletedSavingsGoalRm(
    Guid Id,
    Guid? SourceSavingsGoalId,
    string? Name,
    decimal? TargetAmount,
    decimal? AmountSaved,
    decimal MonthlyContribution,
    DateTime ClosedAt);

// Outcome of a carry-over decision recorded against a closed source month.
// Sourced from the BudgetMonthLifecycleEvent (event type "carry-over-applied")
// where RelatedBudgetMonthId points back to the closed source month.
public sealed record BudgetMonthCarryOverOutcomeRm(
    string Mode,
    decimal Amount,
    string? TargetYearMonth);
