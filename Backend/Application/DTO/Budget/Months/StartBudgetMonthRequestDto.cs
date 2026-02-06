namespace Backend.Application.DTO.Budget.Months;

public sealed record StartBudgetMonthRequestDto(
    string TargetYearMonth,
    bool ClosePreviousOpenMonth,
    string CarryOverMode,     // none|full|custom
    decimal CarryOverAmount,
    bool CreateSkippedMonths
);
