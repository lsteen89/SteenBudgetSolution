using Backend.Domain.Common.Constants;
using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

// Errors for the per-month base savings editor (`BudgetMonthSavings.MonthlySavings`
// / `Savings.MonthlySavings`). Kept distinct from the savings-goal and
// savings-method error catalogs so the frontend can switch on a code that
// describes "the base savings habit", not "the savings tree as a whole".
public static class BaseSavingsErrors
{
    // The current month has no `Savings` baseline (`BudgetMonthSavings.SourceSavingsId`
    // is NULL). Plan-writing scopes (`currentMonthAndBudgetPlan` / `budgetPlanOnly`)
    // are rejected with this error rather than silently creating a `Savings`
    // row — the dialog must offer only `currentMonthOnly` in that case.
    public static readonly Error PlanMissing =
        new(
            "BaseSavings.PlanMissing",
            "The budget plan does not have a savings baseline; only the current month can be edited.",
            ErrorType.Conflict);

    public static readonly Error NotFound =
        new(
            "BaseSavings.NotFound",
            "Could not load the month's base savings row.",
            ErrorType.NotFound);
}
