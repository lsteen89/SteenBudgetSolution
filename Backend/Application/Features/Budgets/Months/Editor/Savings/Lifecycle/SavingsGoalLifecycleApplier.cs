using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.Lifecycle;

// Owns the rules for moving a savings goal between lifecycle states.
//
// Status only ever takes two values: "active" and "closed". The three actions
// users can take (complete, cancel, remove) are different *reasons* for the
// same Status transition: active -> closed. There is no path back, and there
// is no hard delete in this layer — "remove" just records that the user no
// longer wants the goal.
//
// The applier is pure: it takes snapshots in, returns Before/After snapshots
// out, and does no I/O. Callers (future command handlers) are responsible for
// loading the rows, gating on month state, persisting the new values, and
// writing the audit row from the returned transition.
public static class SavingsGoalLifecycleApplier
{
    // Validates the structural invariants on a snapshot regardless of which
    // action is being applied: active rows must not carry closed metadata,
    // closed rows must carry it. Run this on the *current* state before any
    // transition so we never accept an action against a malformed row.
    public static Result EnsureSnapshotIsConsistent(SavingsGoalLifecycleSnapshot snapshot)
    {
        if (!SavingsGoalStatuses.IsSupported(snapshot.Status))
            return Result.Failure(SavingsGoalLifecycleErrors.InvalidStatus);

        if (snapshot.Status == SavingsGoalStatuses.Active)
        {
            if (snapshot.ClosedReason is not null)
                return Result.Failure(SavingsGoalLifecycleErrors.ActiveGoalHasClosedReason);
            if (snapshot.ClosedAt is not null)
                return Result.Failure(SavingsGoalLifecycleErrors.ActiveGoalHasClosedAt);
            return Result.Success();
        }

        // Status is Closed.
        if (string.IsNullOrEmpty(snapshot.ClosedReason))
            return Result.Failure(SavingsGoalLifecycleErrors.ClosedGoalMissingReason);
        if (snapshot.ClosedAt is null)
            return Result.Failure(SavingsGoalLifecycleErrors.ClosedGoalMissingClosedAt);
        return Result.Success();
    }

    // Lifecycle mutations only run against editable months (open or planned).
    // Closed and skipped months are historical and must not be changed by a
    // complete / cancel / remove. Callers pass the month status they already
    // resolved from BudgetMonth.Status.
    public static Result EnsureMonthAllowsLifecycle(string monthStatus)
    {
        if (BudgetMonthEditability.IsEditable(monthStatus))
            return Result.Success();

        return Result.Failure(SavingsGoalLifecycleErrors.MonthNotOpen);
    }

    // Checks that `action` is a known verb and that `current` is in a state
    // that accepts it. Today the only allowed transition is
    //   active -> closed/<reason>
    // so any closed row rejects every action.
    public static Result ValidateTransition(
        SavingsGoalLifecycleSnapshot current,
        string action)
    {
        var consistency = EnsureSnapshotIsConsistent(current);
        if (consistency.IsFailure)
            return consistency;

        if (!SavingsGoalLifecycleActions.IsSupported(action))
            return Result.Failure(SavingsGoalLifecycleErrors.UnknownAction);

        if (current.Status == SavingsGoalStatuses.Closed)
            return Result.Failure(SavingsGoalLifecycleErrors.AlreadyClosed);

        return Result.Success();
    }

    // Applies the action to a month-level row. Always called by future
    // command handlers, including for month-only goals (where it is the only
    // row touched).
    public static Result<SavingsGoalLifecycleTransition> ApplyToMonthGoal(
        SavingsGoalLifecycleSnapshot current,
        string action,
        DateTime nowUtc)
    {
        var validation = ValidateTransition(current, action);
        if (validation.IsFailure)
            return Result<SavingsGoalLifecycleTransition>.Failure(validation.Error);

        var reason = SavingsGoalLifecycleActions.ToClosedReason(action)!;
        var after = new SavingsGoalLifecycleSnapshot(
            Status: SavingsGoalStatuses.Closed,
            ClosedReason: reason,
            ClosedAt: nowUtc);

        return Result<SavingsGoalLifecycleTransition>.Success(
            new SavingsGoalLifecycleTransition(Before: current, After: after));
    }

    // Applies the action to the linked plan-level SavingsGoal row, if there
    // is one. Pass null for `sourceCurrent` when the month goal is month-only
    // (BudgetMonthSavingsGoal.SourceSavingsGoalId is null) — in that case the
    // result is Success(null) and no plan-row write should happen.
    public static Result<SavingsGoalLifecycleTransition?> ApplyToSourceGoalIfLinked(
        SavingsGoalLifecycleSnapshot? sourceCurrent,
        string action,
        DateTime nowUtc)
    {
        if (sourceCurrent is null)
            return Result<SavingsGoalLifecycleTransition?>.Success(null);

        var applied = ApplyToMonthGoal(sourceCurrent, action, nowUtc);
        if (applied.IsFailure)
            return Result<SavingsGoalLifecycleTransition?>.Failure(applied.Error);

        return Result<SavingsGoalLifecycleTransition?>.Success(applied.Value);
    }
}
