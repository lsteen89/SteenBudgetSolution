using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

public static partial class BudgetMonthDebtErrors
{
    public static readonly Error NotFound =
        new("BudgetMonthDebt.NotFound", "Debt was not found in the selected month.");

    public static readonly Error RowDeleted =
        new("BudgetMonthDebt.RowDeleted", "Debt is already deleted.");

    public static readonly Error RowClosed =
        new("BudgetMonthDebt.RowClosed", "Debt is closed and cannot be edited.");

    public static readonly Error CannotUpdatePlanForMonthOnlyRow =
        new("BudgetMonthDebt.CannotUpdatePlanForMonthOnlyRow", "Month-only debts cannot update budget plan data.");

    public static readonly Error SourcePlanNotFound =
        new("BudgetMonthDebt.SourcePlanNotFound", "The linked budget plan debt no longer exists.");

    // Debt PR 1: planned-payment patches require an `included` row. Future PRs
    // (PR 4 — participation actions) provide explicit commands for moving a row
    // to `included` again before its planned payment can be edited.
    public static readonly Error RowNotIncluded =
        new("BudgetMonthDebt.RowNotIncluded", "Debt is not included this month and cannot be edited until it is included again.");

    public static readonly Error RowRemoved =
        new("BudgetMonthDebt.RowRemoved", "Debt has been removed from this month.");

    // Debt PR 1: the source plan row reached a terminal lifecycle state
    // (`paidOff` / `archived` / `deleted`) and no longer accepts plan-scope mutations.
    public static readonly Error SourceLifecycleClosed =
        new("BudgetMonthDebt.SourceLifecycleClosed", "Debt plan is closed and cannot be edited.");

    // Debt PR 3: balance is a liability snapshot and must stay non-negative.
    // The validator catches this first; the handler re-checks defensively, and
    // a CHECK constraint on `DebtBalanceEvent.NewBalance` provides the last
    // layer so an in-flight bug cannot persist a negative liability.
    public static readonly Error BalanceNegative =
        new("BudgetMonthDebt.BalanceNegative", "Balance must be zero or positive.");

    // Debt PR 3 (review fix): an unsupported scope on the balance handler
    // would otherwise fall through both write flags as `false` and return a
    // misleading "success / nothing updated" response. Defensive guard
    // mirrors the negative-balance defense above so a bypassed validator
    // pipeline still fails loudly rather than silently no-op'ing.
    public static readonly Error ScopeUnsupported =
        new("BudgetMonthDebt.ScopeUnsupported",
            "Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");

    // --- Debt PR 4: lifecycle / participation actions --------------------

    // Participation command rejects unknown or unsupported values up front so
    // the SQL CHECK constraint never has to be the first line of defense.
    // `removed` is intentionally excluded — month-only rows reach that state
    // via the dedicated remove command, not the participation toggle.
    public static readonly Error ParticipationUnsupported =
        new("BudgetMonthDebt.ParticipationUnsupported",
            "Participation must be either included or notIncluded.");

    // Submitting the row's current participation is a deliberate no-op rather
    // than an error elsewhere in the editor; surfacing it as an error here
    // lets the FE distinguish "nothing changed" from "successfully changed"
    // without inspecting the response shape.
    public static readonly Error ParticipationUnchanged =
        new("BudgetMonthDebt.ParticipationUnchanged",
            "Debt is already in the requested participation state.");

    // mark-paid-off / archive / restore require a source-linked row because
    // they mutate `Debt` lifecycle. Month-only rows have no source to flip,
    // so the FE points the user at remove for cleanup-only intent.
    public static readonly Error SourceLinkRequired =
        new("BudgetMonthDebt.SourceLinkRequired",
            "This action requires a source-linked debt; month-only rows are not supported.");

    // Distinct from `SourceLifecycleClosed` (which covers any non-active
    // source for an editor mutation). `AlreadyPaidOff` / `AlreadyArchived`
    // give the FE precise reason codes so confirmation modals can disable
    // the wrong action with a one-liner instead of a generic message.
    public static readonly Error AlreadyPaidOff =
        new("BudgetMonthDebt.AlreadyPaidOff",
            "Debt is already marked as paid off.");

    public static readonly Error AlreadyArchived =
        new("BudgetMonthDebt.AlreadyArchived",
            "Debt is already archived.");

    // Restore only operates on archived sources in PR 4. `paidOff` and
    // `deleted` would each need their own undo semantics (re-opening
    // historical balance state, un-deleting), which are deliberately out of
    // scope for this PR.
    public static readonly Error NotArchived =
        new("BudgetMonthDebt.NotArchived",
            "Debt is not archived; only archived debts can be restored.");

    // Source-linked rows must use archive (reversible, history-preserving)
    // instead of remove (which would silently drop a row that has carried
    // payment history). The FE turns this into actionable copy.
    public static readonly Error RemoveBlockedForSourceLinked =
        new("BudgetMonthDebt.RemoveBlockedForSourceLinked",
            "Source-linked debts cannot be removed; archive instead.");

    // Notes are user-visible audit text; matches the cap on
    // `Debt.LifecycleReason` (VARCHAR(255)) and the existing
    // `BudgetMonthDebt.ParticipationReason` column.
    public static readonly Error NoteTooLong =
        new("BudgetMonthDebt.NoteTooLong",
            "Note must be 255 characters or fewer.");
}
