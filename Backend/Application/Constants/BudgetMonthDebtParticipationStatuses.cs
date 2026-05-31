namespace Backend.Application.Constants;

/// <summary>
/// Per-month participation for a <c>BudgetMonthDebt</c> row. Orthogonal to
/// source lifecycle on <c>Debt</c> (see <see cref="DebtSourceLifecycleStatuses"/>).
/// Only <see cref="Included"/> rows count toward the month's debt payment total;
/// liability balance may still include <see cref="NotIncluded"/> rows because
/// the underlying balance is still owed.
/// </summary>
public static class BudgetMonthDebtParticipationStatuses
{
    /// <summary>Row's planned payment counts in the month's debt payment total.</summary>
    public const string Included = "included";

    /// <summary>Row is visible but its planned payment is excluded from monthly outflow; balance still owed.</summary>
    public const string NotIncluded = "notIncluded";

    /// <summary>Row is hidden by default and excluded from totals. Mirrors legacy <c>IsDeleted = 1</c>.</summary>
    public const string Removed = "removed";

    public static bool IsSupported(string? value)
        => value == Included ||
           value == NotIncluded ||
           value == Removed;

    /// <summary>True when the row's planned payment should count toward the month's debt payment total.</summary>
    public static bool CountsInMonthlyPaymentTotal(string? value)
        => value == Included;
}
