namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBaselineSavingsGoalModel(
    Guid SavingsGoalId,
    decimal MonthlyContribution,
    Guid ActorPersoid,
    DateTime UtcNow);
