namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBudgetMonthSavingsGoalTargetAmountModel(
    Guid Id,
    Guid BudgetMonthSavingsId,
    decimal TargetAmount,
    Guid ActorPersoid,
    DateTime UtcNow);
