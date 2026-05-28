namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

/// <summary>
/// Updates TargetDate on every BudgetMonthSavingsGoal row that points to the
/// same source SavingsGoal AND lives in an open BudgetMonth, except the row
/// being edited directly. Closed/skipped months are never touched.
/// </summary>
public sealed record UpdateOpenLinkedMonthSavingsGoalTargetDateModel(
    Guid SourceSavingsGoalId,
    Guid ExcludeMonthGoalId,
    DateTime? TargetDate,
    Guid ActorPersoid,
    DateTime UtcNow);
