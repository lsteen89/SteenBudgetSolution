namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

// Pure projection of the lifecycle-relevant columns on a plan-level SavingsGoal
// row. Used by the lifecycle service to load the source row's current state
// before applying a transition. Lives outside the lifecycle applier folder so
// repository implementations don't take a dependency on the feature slice.
public sealed class BudgetMonthSavingsGoalLifecycleReadModel
{
    public Guid Id { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? ClosedReason { get; init; }
    public DateTime? ClosedAt { get; init; }
}
