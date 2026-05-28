namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

/// <summary>
/// Updates TargetAmount on every BudgetMonthSavingsGoal row that points to the
/// same source SavingsGoal AND lives in an open BudgetMonth, except the row
/// being edited directly. Closed/skipped months are never touched —
/// historical target truth is preserved for the archive view.
/// </summary>
public sealed record UpdateOpenLinkedMonthSavingsGoalTargetAmountModel(
    Guid SourceSavingsGoalId,
    Guid ExcludeMonthGoalId,
    decimal TargetAmount,
    Guid ActorPersoid,
    DateTime UtcNow);
