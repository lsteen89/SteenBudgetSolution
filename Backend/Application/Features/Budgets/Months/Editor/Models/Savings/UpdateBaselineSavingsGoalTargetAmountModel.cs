namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBaselineSavingsGoalTargetAmountModel(
    Guid SavingsGoalId,
    decimal TargetAmount,
    Guid ActorPersoid,
    DateTime UtcNow);
