namespace Backend.Application.Features.Budgets.Months.Models.Insert;

public sealed record BudgetMonthIncomeHouseholdMemberSeedInsertModel(
    Guid Id,
    Guid SourceHouseholdMemberId,
    string Name,
    decimal IncomeMonthly,
    int Frequency,
    int SortOrder);