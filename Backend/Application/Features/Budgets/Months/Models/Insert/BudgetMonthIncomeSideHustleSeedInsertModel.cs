namespace Backend.Application.Features.Budgets.Months.Models.Insert;

public sealed record BudgetMonthIncomeSideHustleSeedInsertModel(
    Guid Id,
    Guid SourceSideHustleId,
    string Name,
    decimal IncomeMonthly,
    int Frequency,
    int SortOrder);
