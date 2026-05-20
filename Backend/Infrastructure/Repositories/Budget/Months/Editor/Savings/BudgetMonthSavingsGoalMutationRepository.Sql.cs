namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Savings;

public sealed partial class BudgetMonthSavingsGoalMutationRepository
{
    private const string GetBudgetMonthMeta = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.YearMonth,
        bm.Status
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    private const string GetSavingsGoalEditorRows = @"
    SELECT
        g.Id,
        g.SourceSavingsGoalId,
        g.Name,
        g.TargetAmount,
        g.TargetDate,
        g.AmountSaved,
        g.MonthlyContribution,
        g.Status,
        g.ClosedReason,
        g.ClosedAt,
        g.IsDeleted
    FROM BudgetMonthSavingsGoal g
    JOIN BudgetMonthSavings s
        ON s.Id = g.BudgetMonthSavingsId
    WHERE s.BudgetMonthId = @BudgetMonthId
      AND s.IsDeleted = 0
      AND (@IncludeDeleted = 1 OR (g.IsDeleted = 0 AND g.Status = 'active'))
    ORDER BY
        g.IsDeleted ASC,
        g.SortOrder,
        g.CreatedAt,
        g.Id;";

    private const string GetSavingsGoalForMutation = @"
    SELECT
        g.Id,
        s.BudgetMonthId,
        g.BudgetMonthSavingsId,
        g.SourceSavingsGoalId,
        g.Name,
        g.TargetAmount,
        g.TargetDate,
        g.AmountSaved,
        g.MonthlyContribution,
        g.Status,
        g.ClosedReason,
        g.ClosedAt,
        g.IsDeleted
    FROM BudgetMonthSavingsGoal g
    JOIN BudgetMonthSavings s
        ON s.Id = g.BudgetMonthSavingsId
    WHERE s.BudgetMonthId = @BudgetMonthId
      AND s.IsDeleted = 0
      AND g.Id = @MonthSavingsGoalId
    LIMIT 1;";

    private const string UpdateMonthSavingsGoalContributionSql = @"
    UPDATE BudgetMonthSavingsGoal
    SET
        MonthlyContribution = @MonthlyContribution,
        IsOverride = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthSavingsId = @BudgetMonthSavingsId;";

    private const string BaselineSavingsGoalExistsSql = @"
    SELECT 1
    FROM SavingsGoal
    WHERE Id = @SavingsGoalId
    LIMIT 1;";

    private const string UpdateBaselineSavingsGoalContributionSql = @"
    UPDATE SavingsGoal
    SET
        MonthlyContribution = @MonthlyContribution,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @SavingsGoalId;";

    /// <summary>
    /// Plan-level field — TargetDate is the goal's plan attribute, never a per-
    /// month override. We do not touch IsOverride here; the column is reserved
    /// for contribution overrides.
    /// </summary>
    private const string UpdateMonthSavingsGoalTargetDateSql = @"
    UPDATE BudgetMonthSavingsGoal
    SET
        TargetDate = @TargetDate,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthSavingsId = @BudgetMonthSavingsId;";

    private const string UpdateBaselineSavingsGoalTargetDateSql = @"
    UPDATE SavingsGoal
    SET
        TargetDate = @TargetDate,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @SavingsGoalId;";

    /// <summary>
    /// Cascade the new TargetDate to every other open BudgetMonthSavingsGoal
    /// row that points at the same source goal. Closed/skipped months are
    /// excluded so historical truth is preserved. The current month row is
    /// excluded because it is updated separately.
    /// </summary>
    private const string UpdateOpenLinkedMonthSavingsGoalTargetDateSql = @"
    UPDATE BudgetMonthSavingsGoal g
    JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
    JOIN BudgetMonth bm ON bm.Id = s.BudgetMonthId
    SET
        g.TargetDate = @TargetDate,
        g.UpdatedAt = @UtcNow,
        g.UpdatedByUserId = @ActorPersoid
    WHERE g.SourceSavingsGoalId = @SourceSavingsGoalId
      AND g.Id <> @ExcludeMonthGoalId
      AND g.IsDeleted = 0
      AND bm.Status = 'open';";

    private const string GetBudgetMonthSavingsForCreateSql = @"
    SELECT
        s.Id            AS BudgetMonthSavingsId,
        s.SourceSavingsId
    FROM BudgetMonthSavings s
    WHERE s.BudgetMonthId = @BudgetMonthId
      AND s.IsDeleted = 0
    LIMIT 1;";

    private const string InsertBaselineSavingsGoalSql = @"
    INSERT INTO SavingsGoal
    (
        Id,
        SavingsId,
        Name,
        TargetAmount,
        TargetDate,
        AmountSaved,
        MonthlyContribution,
        OpenedAt,
        Status,
        CreatedAt,
        CreatedByUserId,
        UpdatedAt,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @SavingsId,
        @Name,
        @TargetAmount,
        @TargetDate,
        @AmountSaved,
        @MonthlyContribution,
        @OpenedAt,
        @Status,
        @UtcNow,
        @ActorPersoid,
        @UtcNow,
        @ActorPersoid
    );";

    /// <summary>
    /// Snapshot of the plan-level row used to validate a source-linked
    /// lifecycle transition. Returns null when the source goal no longer
    /// exists (FK is ON DELETE SET NULL so callers must handle this).
    /// </summary>
    private const string GetSourceSavingsGoalLifecycleSql = @"
    SELECT
        Id,
        Status,
        ClosedReason,
        ClosedAt
    FROM SavingsGoal
    WHERE Id = @SavingsGoalId
    LIMIT 1;";

    /// <summary>
    /// Applies a lifecycle transition to a BudgetMonthSavingsGoal row in one
    /// statement. Sets Status / ClosedReason / ClosedAt / IsDeleted together so
    /// the CK_*_Status check constraint is never seen in an intermediate state.
    /// IsOverride is intentionally left untouched — overrides describe
    /// contribution scoping, not lifecycle membership.
    /// </summary>
    private const string UpdateMonthSavingsGoalLifecycleSql = @"
    UPDATE BudgetMonthSavingsGoal
    SET
        Status         = @Status,
        ClosedReason   = @ClosedReason,
        ClosedAt       = @ClosedAt,
        IsDeleted      = @IsDeleted,
        UpdatedAt      = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthSavingsId = @BudgetMonthSavingsId;";

    /// <summary>
    /// Applies a lifecycle transition to the plan-level SavingsGoal row.
    /// There is no IsDeleted on the source row — 'remove' only marks the
    /// month materialization deleted while the plan goal is simply closed.
    /// </summary>
    private const string UpdateBaselineSavingsGoalLifecycleSql = @"
    UPDATE SavingsGoal
    SET
        Status         = @Status,
        ClosedReason   = @ClosedReason,
        ClosedAt       = @ClosedAt,
        UpdatedAt      = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @SavingsGoalId;";

    // Read-only projection for the "previous goals" archive on the savings
    // editor. Budget-scoped, not month-scoped: a goal completed in April must
    // keep appearing under "Tidigare mål" when the user moves into May, but
    // the close-month materializer (correctly) does not re-create a closed
    // baseline in any later month. So we read from two sources and union:
    //
    //   * Plan-linked goals       — one canonical row per baseline SavingsGoal
    //                               that is closed (completed / cancelled).
    //                               SourceSavingsGoalId echoes the goal's own
    //                               Id so the FE sees IsMonthOnly = false.
    //   * Month-only goals        — closed BudgetMonthSavingsGoal rows with
    //                               no plan link (SourceSavingsGoalId IS NULL)
    //                               anywhere in the budget. These only exist
    //                               in the month they were created in.
    //
    // Removed (ClosedReason = 'removed') and IsDeleted rows are stripped
    // server-side.
    //
    // `AmountSavedAtClose` is derived, never raw. Close-month does NOT
    // advance AmountSaved, so a completed goal's raw stored value
    // under-reports what the user reached. Rule mirrors the recap contract:
    //   completed → AmountSaved + MonthlyContribution
    //   cancelled → AmountSaved
    // The UI must not recompute this.
    //
    // `@UpperBoundUtc` is the exclusive upper bound on ClosedAt — typically
    // the start of the month AFTER the user's selected yearMonth. This
    // keeps the contract honest: viewing a past month never leaks goals
    // closed later. For today's open-month-only FE this filter is a no-op.
    //
    // Sorted by ClosedAt DESC then Name then Id for a stable ordering across
    // both source tables.
    private const string GetSavingsGoalArchiveRows = @"
    SELECT * FROM (
        SELECT
            sg.Id                                AS Id,
            sg.Id                                AS SourceSavingsGoalId,
            sg.Name                              AS Name,
            sg.TargetAmount                      AS TargetAmount,
            sg.TargetDate                        AS TargetDate,
            CASE
                WHEN sg.ClosedReason = 'completed'
                    THEN COALESCE(sg.AmountSaved, 0) + sg.MonthlyContribution
                ELSE sg.AmountSaved
            END                                  AS AmountSavedAtClose,
            sg.MonthlyContribution               AS MonthlyContribution,
            sg.Status                            AS Status,
            sg.ClosedReason                      AS ClosedReason,
            sg.ClosedAt                          AS ClosedAt
        FROM SavingsGoal sg
        JOIN Savings s ON s.Id = sg.SavingsId
        WHERE s.BudgetId = @BudgetId
          AND sg.Status = 'closed'
          AND sg.ClosedReason IN ('completed', 'cancelled')
          AND sg.ClosedAt < @UpperBoundUtc

        UNION ALL

        SELECT
            g.Id                                 AS Id,
            NULL                                 AS SourceSavingsGoalId,
            g.Name                               AS Name,
            g.TargetAmount                       AS TargetAmount,
            g.TargetDate                         AS TargetDate,
            CASE
                WHEN g.ClosedReason = 'completed'
                    THEN COALESCE(g.AmountSaved, 0) + g.MonthlyContribution
                ELSE g.AmountSaved
            END                                  AS AmountSavedAtClose,
            g.MonthlyContribution                AS MonthlyContribution,
            g.Status                             AS Status,
            g.ClosedReason                       AS ClosedReason,
            g.ClosedAt                           AS ClosedAt
        FROM BudgetMonthSavingsGoal g
        JOIN BudgetMonthSavings ms ON ms.Id = g.BudgetMonthSavingsId
        JOIN BudgetMonth bm ON bm.Id = ms.BudgetMonthId
        WHERE bm.BudgetId = @BudgetId
          AND g.SourceSavingsGoalId IS NULL
          AND g.IsDeleted = 0
          AND ms.IsDeleted = 0
          AND g.Status = 'closed'
          AND g.ClosedReason IN ('completed', 'cancelled')
          AND g.ClosedAt < @UpperBoundUtc
    ) archive
    ORDER BY
        ClosedAt DESC,
        Name,
        Id;";

    // Selects active monthly savings-goal rows whose projected AmountSaved
    // (current + this month's contribution) reaches the TargetAmount. Read
    // straight from BudgetMonthSavingsGoal so the projection is always
    // anchored on month state, never the baseline plan. NULL AmountSaved is
    // treated as 0. Goals without a positive TargetAmount are excluded.
    private const string GetSavingsGoalCompletionCandidates = @"
    SELECT
        g.Id,
        g.SourceSavingsGoalId,
        g.Name,
        g.TargetAmount,
        g.AmountSaved,
        g.MonthlyContribution
    FROM BudgetMonthSavingsGoal g
    JOIN BudgetMonthSavings s
        ON s.Id = g.BudgetMonthSavingsId
    WHERE s.BudgetMonthId = @BudgetMonthId
      AND s.IsDeleted = 0
      AND g.IsDeleted = 0
      AND g.Status = 'active'
      AND g.TargetAmount IS NOT NULL
      AND g.TargetAmount > 0
      AND (COALESCE(g.AmountSaved, 0) + g.MonthlyContribution) >= g.TargetAmount
    ORDER BY g.SortOrder, g.CreatedAt, g.Id;";

    // Idempotently closes still-active month rows pointing at the same source
    // goal, excluding the row we already updated directly. Skips closed rows
    // and rows in skipped months — both are historical and must not change.
    private const string CloseLinkedActiveMonthSavingsGoalsForSourceSql = @"
    UPDATE BudgetMonthSavingsGoal g
    JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
    JOIN BudgetMonth bm ON bm.Id = s.BudgetMonthId
    SET
        g.Status        = 'closed',
        g.ClosedReason  = @ClosedReason,
        g.ClosedAt      = @ClosedAt,
        g.UpdatedAt     = @UtcNow,
        g.UpdatedByUserId = @ActorPersoid
    WHERE g.SourceSavingsGoalId = @SourceSavingsGoalId
      AND g.Id <> @ExcludeMonthGoalId
      AND g.IsDeleted = 0
      AND g.Status = 'active'
      AND bm.Status = 'open';";

    private const string InsertMonthSavingsGoalSql = @"
    INSERT INTO BudgetMonthSavingsGoal
    (
        Id,
        BudgetMonthSavingsId,
        SourceSavingsGoalId,
        Name,
        TargetAmount,
        TargetDate,
        AmountSaved,
        MonthlyContribution,
        OpenedAt,
        Status,
        IsOverride,
        IsDeleted,
        SortOrder,
        CreatedAt,
        CreatedByUserId,
        UpdatedAt,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthSavingsId,
        @SourceSavingsGoalId,
        @Name,
        @TargetAmount,
        @TargetDate,
        @AmountSaved,
        @MonthlyContribution,
        @OpenedAt,
        @Status,
        1,
        0,
        0,
        @UtcNow,
        @ActorPersoid,
        @UtcNow,
        @ActorPersoid
    );";
}
