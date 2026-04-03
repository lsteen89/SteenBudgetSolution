namespace Backend.Application.Features.Budgets.Months.Models.Baseline;

public sealed record BaselineSideHustleSeedRm(
    Guid Id,
    string Name,
    decimal IncomeMonthly,
    int Frequency,
    int SortOrder);