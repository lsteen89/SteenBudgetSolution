namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBudgetMonthSavingsGoalTargetDateModel(
    Guid Id,
    Guid BudgetMonthSavingsId,
    DateTime? TargetDate,
    Guid ActorPersoid,
    DateTime UtcNow);
