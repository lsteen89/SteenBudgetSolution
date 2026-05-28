namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record InsertBudgetMonthSavingsGoalModel(
    Guid Id,
    Guid BudgetMonthSavingsId,
    Guid? SourceSavingsGoalId,
    string Name,
    decimal TargetAmount,
    DateTime? TargetDate,
    decimal AmountSaved,
    decimal MonthlyContribution,
    string Status,
    DateTime OpenedAt,
    Guid ActorPersoid,
    DateTime UtcNow);
