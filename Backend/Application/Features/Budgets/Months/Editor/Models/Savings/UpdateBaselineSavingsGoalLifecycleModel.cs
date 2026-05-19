namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBaselineSavingsGoalLifecycleModel(
    Guid SavingsGoalId,
    string Status,
    string? ClosedReason,
    DateTime? ClosedAt,
    Guid ActorPersoid,
    DateTime UtcNow);
