using Backend.Domain.Common.Constants;
using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

// Errors specific to the savings goal lifecycle transition contract. These
// are intentionally separate from BudgetMonthSavingsGoalErrors so they can
// also describe transitions on the plan-level SavingsGoal row, not just the
// month materialization.
public static partial class SavingsGoalLifecycleErrors
{
    public static readonly Error UnknownAction =
        new(
            "SavingsGoalLifecycle.UnknownAction",
            "Unknown savings goal lifecycle action.",
            ErrorType.Validation);

    public static readonly Error AlreadyClosed =
        new(
            "SavingsGoalLifecycle.AlreadyClosed",
            "Savings goal is already closed and cannot be changed.",
            ErrorType.Conflict);

    public static readonly Error InvalidStatus =
        new(
            "SavingsGoalLifecycle.InvalidStatus",
            "Savings goal has an unsupported status value.",
            ErrorType.Validation);

    public static readonly Error ActiveGoalHasClosedReason =
        new(
            "SavingsGoalLifecycle.ActiveGoalHasClosedReason",
            "Active savings goal must not have a closed reason.",
            ErrorType.Validation);

    public static readonly Error ActiveGoalHasClosedAt =
        new(
            "SavingsGoalLifecycle.ActiveGoalHasClosedAt",
            "Active savings goal must not have a closed timestamp.",
            ErrorType.Validation);

    public static readonly Error ClosedGoalMissingReason =
        new(
            "SavingsGoalLifecycle.ClosedGoalMissingReason",
            "Closed savings goal must have a closed reason.",
            ErrorType.Validation);

    public static readonly Error ClosedGoalMissingClosedAt =
        new(
            "SavingsGoalLifecycle.ClosedGoalMissingClosedAt",
            "Closed savings goal must have a closed timestamp.",
            ErrorType.Validation);

    public static readonly Error MonthNotOpen =
        new(
            "SavingsGoalLifecycle.MonthNotOpen",
            "Savings goal lifecycle changes are only allowed on an open month.",
            ErrorType.Conflict);
}
