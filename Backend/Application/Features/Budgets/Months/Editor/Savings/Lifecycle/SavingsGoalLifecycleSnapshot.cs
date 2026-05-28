namespace Backend.Application.Features.Budgets.Months.Editor.Savings.Lifecycle;

// Pure projection of the lifecycle-relevant columns on a savings goal row.
// Works for both SavingsGoal (plan) and BudgetMonthSavingsGoal (month). Carrying
// only these three fields keeps the applier easy to unit-test without staging
// a full row.
public sealed record SavingsGoalLifecycleSnapshot(
    string Status,
    string? ClosedReason,
    DateTime? ClosedAt);

// Before/after pair returned by the applier when a transition is accepted.
// Handlers turn the After snapshot into repository writes, and use the pair
// directly as the audit change-set payload.
public sealed record SavingsGoalLifecycleTransition(
    SavingsGoalLifecycleSnapshot Before,
    SavingsGoalLifecycleSnapshot After);
