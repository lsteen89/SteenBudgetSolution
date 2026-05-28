namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBudgetMonthSavingsGoalNameModel(
    Guid Id,
    Guid BudgetMonthSavingsId,
    string Name,
    Guid ActorPersoid,
    DateTime UtcNow);
