namespace Backend.Application.DTO.Budget.Months;

public sealed record BudgetMonthListItemDto(
    string YearMonth,
    string Status,     // open|closed|skipped
    DateTime OpenedAt,
    DateTime? ClosedAt
);

public sealed record BudgetMonthsStatusDto(
    string? OpenMonthYearMonth,
    string CurrentYearMonth,
    int GapMonthsCount,
    IReadOnlyList<BudgetMonthListItemDto> Months,
    string SuggestedAction // createFirstMonth|promptStartCurrent|none
);
