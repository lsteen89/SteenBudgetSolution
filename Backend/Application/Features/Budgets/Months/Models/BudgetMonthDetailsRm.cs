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
