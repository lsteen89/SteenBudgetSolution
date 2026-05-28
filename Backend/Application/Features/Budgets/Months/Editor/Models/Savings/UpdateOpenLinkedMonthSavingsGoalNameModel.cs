namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

/// <summary>
/// Updates Name on every BudgetMonthSavingsGoal row that points to the same
/// source SavingsGoal AND lives in an open BudgetMonth, except the row being
/// edited directly. Closed/skipped months are never touched — historical name
/// truth is preserved for the archive.
/// </summary>
public sealed record UpdateOpenLinkedMonthSavingsGoalNameModel(
    Guid SourceSavingsGoalId,
    Guid ExcludeMonthGoalId,
    string Name,
    Guid ActorPersoid,
    DateTime UtcNow);
