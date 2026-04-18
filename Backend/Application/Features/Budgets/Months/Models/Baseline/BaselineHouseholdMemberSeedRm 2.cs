namespace Backend.Application.Features.Budgets.Months.Models.Baseline;

public sealed record BaselineHouseholdMemberSeedRm(
    Guid Id,
    string Name,
    decimal IncomeMonthly,
    int Frequency,
    int SortOrder);