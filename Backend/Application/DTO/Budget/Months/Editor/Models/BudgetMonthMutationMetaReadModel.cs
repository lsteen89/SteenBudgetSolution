namespace Backend.Application.Features.Budgets.Months.Editor.Models;

public sealed record BudgetMonthMutationMetaReadModel(
    Guid BudgetMonthId,
    string YearMonth,
    string Status);