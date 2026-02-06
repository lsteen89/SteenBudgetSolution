namespace Backend.Application.Features.Budgets.Months.Models;

public sealed record OpenMonthInsert(
    Guid BudgetId,
    string YearMonth,
    string CarryOverMode,
    decimal? CarryOverAmount,
    Guid UserId,
    DateTime NowUtc
);

public sealed record SkippedMonthInsert(
    Guid BudgetId,
    string YearMonth,
    Guid UserId,
    DateTime NowUtc
);

public sealed record CloseMonthSnapshot(
    Guid BudgetMonthId,
    Guid UserId,
    DateTime NowUtc,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal TotalSavings,
    decimal TotalDebtPayments,
    decimal FinalBalance
);
