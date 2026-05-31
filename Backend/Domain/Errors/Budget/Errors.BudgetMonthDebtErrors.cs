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
}
