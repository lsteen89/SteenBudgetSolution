namespace Backend.Application.Features.Budgets.Months.Models;

public sealed record BudgetMonthListRm(
    Guid Id,
    Guid BudgetId,
    string YearMonth,
    string Status,
    DateTime OpenedAt,
    DateTime? ClosedAt,
    string CarryOverMode,
    decimal? CarryOverAmount
);
