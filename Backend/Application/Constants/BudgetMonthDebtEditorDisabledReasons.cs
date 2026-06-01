namespace Backend.Application.Constants;

/// <summary>
/// Stable reason codes attached to a Debt editor row when one or more actions
/// are disabled (Debt PR 5). Codes mirror the precise rejection reasons used
/// by the backend command guards in PR 2 / PR 3 / PR 4 so the frontend can
/// render targeted copy without reverse-engineering an error string.
///
/// One row may carry several codes (e.g. a paid-off row in a closed month
/// gets both <see cref="MonthClosed"/> and <see cref="SourcePaidOff"/>); the
/// resolver keeps the list deduped and stable-ordered for snapshot tests.
/// </summary>
public static class BudgetMonthDebtEditorDisabledReasons
{
    // Month-level guards. Every row in a non-open month carries one of these.
    public const string MonthClosed  = "monthClosed";
    public const string MonthSkipped = "monthSkipped";

    // Row-level immutability guards from the mutation handlers.
    public const string RowRemoved   = "rowRemoved";
    public const string RowDeleted   = "rowDeleted";
    public const string RowClosed    = "rowClosed";

    // Plan-scope guards (used by `CanUpdatePlan` and by edit / balance actions
    // when the source row would have to move).
    public const string MonthOnlyNoPlan   = "monthOnlyNoPlan";
    public const string SourceMissing     = "sourceMissing";

    // Source lifecycle terminations. Surfaced per action so the FE can
    // distinguish "this debt is paid off" from "this debt is archived".
    public const string SourcePaidOff  = "sourcePaidOff";
    public const string SourceArchived = "sourceArchived";
    public const string SourceDeleted  = "sourceDeleted";

    // Participation no-op gates.
    public const string AlreadyIncluded    = "alreadyIncluded";
    public const string AlreadyNotIncluded = "alreadyNotIncluded";

    // Remove guard — source-linked rows must use archive, never remove.
    public const string SourceLinkedHistoryExists = "sourceLinkedHistoryExists";
}
