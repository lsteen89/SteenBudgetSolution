namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBaselineSavingsGoalNameModel(
    Guid SavingsGoalId,
    string Name,
    Guid ActorPersoid,
    DateTime UtcNow);
