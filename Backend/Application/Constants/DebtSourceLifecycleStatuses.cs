namespace Backend.Application.Constants;

/// <summary>
/// Source-level lifecycle for the <c>Debt</c> plan row. Distinct from month
/// participation on <c>BudgetMonthDebt</c> (see <see cref="BudgetMonthDebtParticipationStatuses"/>).
/// Only <see cref="Active"/> materializes into new <c>BudgetMonthDebt</c> rows;
/// the other states are explicit lifecycle terminations.
/// </summary>
public static class DebtSourceLifecycleStatuses
{
    /// <summary>Plan row is open; materializes into future months and participates by default.</summary>
    public const string Active = "active";

    /// <summary>Debt fully paid off. Future materialization stops; historical month rows are preserved.</summary>
    public const string PaidOff = "paidOff";

    /// <summary>Debt hidden from normal planning. Future materialization stops; restorable to <see cref="Active"/>.</summary>
    public const string Archived = "archived";

    /// <summary>Soft-deleted plan row. Future materialization stops; never hard-delete rows with history.</summary>
    public const string Deleted = "deleted";

    public static bool IsSupported(string? value)
        => value == Active ||
           value == PaidOff ||
           value == Archived ||
           value == Deleted;

    /// <summary>
    /// True only for the lifecycle state that should materialize into newly opened
    /// budget months. Mirrors <c>BudgetMonthSeedSourceRepository.GetActiveDebtsSql</c>.
    /// </summary>
    public static bool IsMaterializable(string? value)
        => value == Active;
}
