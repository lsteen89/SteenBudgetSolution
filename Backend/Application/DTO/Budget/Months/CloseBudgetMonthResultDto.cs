using Backend.Application.DTO.Budget.Dashboard;

namespace Backend.Application.DTO.Budget.Months;

public sealed record CloseBudgetMonthClosedMonthDto(
    string YearMonth,
    string Status,
    DateTime? ClosedAtUtc
);

public sealed record CloseBudgetMonthNextMonthDto(
    string YearMonth,
    string Status,
    string CarryOverMode,
    decimal? CarryOverAmount
);

public sealed record CloseBudgetMonthResultDto(
    CloseBudgetMonthClosedMonthDto ClosedMonth,
    BudgetMonthSnapshotTotalsDto SnapshotTotals,
    CloseBudgetMonthNextMonthDto NextMonth
);
