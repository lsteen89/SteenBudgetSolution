namespace Backend.Application.DTO.Budget.Months;

public sealed record PlanNextMonthResultDto(
    string FromYearMonth,
    string PlannedYearMonth,
    string Status,
    bool WasCreated);
