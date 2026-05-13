namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBudgetMonthSavingsGoalModel(
    Guid Id,
    Guid BudgetMonthSavingsId,
    decimal MonthlyContribution,
    Guid ActorPersoid,
    DateTime UtcNow);
