namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBaselineSavingsGoalTargetDateModel(
    Guid SavingsGoalId,
    DateTime? TargetDate,
    Guid ActorPersoid,
    DateTime UtcNow);
