namespace Backend.Application.Constants;

/// <summary>
/// Visual ledger groups exposed by the Debt editor read model (Debt PR 5).
/// One row maps to exactly one group, derived from <see cref="DebtSourceLifecycleStatuses"/>
/// and <see cref="BudgetMonthDebtParticipationStatuses"/> in
/// <c>DebtEditorActionResolver.ResolveGroup</c>.
///
/// Group precedence (highest to lowest):
///   1. paid     — <c>SourceLifecycleStatus = paidOff</c>
///   2. archived — <c>SourceLifecycleStatus = archived</c>
///   3. skipped  — <c>ParticipationStatus = notIncluded</c> (and not paid/archived)
///   4. active   — everything else, including month-only rows
///
/// Removed rows (<c>ParticipationStatus = removed</c> / legacy <c>IsDeleted = 1</c>)
/// are hidden by the default editor read and never receive a group label.
/// </summary>
public static class BudgetMonthDebtEditorGroups
{
    public const string Active   = "active";
    public const string Skipped  = "skipped";
    public const string Paid     = "paid";
    public const string Archived = "archived";
}
