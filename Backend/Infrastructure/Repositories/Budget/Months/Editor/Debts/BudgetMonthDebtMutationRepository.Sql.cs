namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Debts;

public sealed partial class BudgetMonthDebtMutationRepository
{
    private const string GetBudgetMonthMeta = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.YearMonth,
        bm.Status
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    // Debt PR 1: surfaces `ParticipationStatus` from the month row and
    // `SourceLifecycleStatus` from the linked `Debt` row (LEFT JOIN — month-only
    // rows have no source and project NULL). Lifecycle and participation are
    // intentionally separate fields; downstream PRs filter on them, the legacy
    // `Status` column is retained for compatibility but should not drive new logic.
    //
    // PR 1.5: `@IncludeDeleted` now also gates `ParticipationStatus = 'removed'`
    // so the new participation column is authoritative even when the legacy
    // `IsDeleted` flag has not been mirrored. Default editor reads
    // (`includeDeleted: false`) show `included` + `notIncluded` rows; diagnostic
    // reads (`includeDeleted: true`) include legacy soft-deleted and removed
    // rows for repair / debugging.
    private const string GetDebtEditorRows = @"
    SELECT
        d.Id,
        d.SourceDebtId,
        d.Name,
        d.Type,
        d.Balance,
        d.Apr,
        d.MonthlyFee,
        d.MinPayment,
        CAST(d.TermMonths AS SIGNED) AS TermMonths,
        d.MonthlyPayment,
        d.Status,
        d.IsDeleted,
        d.ParticipationStatus,
        src.Status AS SourceLifecycleStatus
    FROM BudgetMonthDebt d
    LEFT JOIN Debt src ON src.Id = d.SourceDebtId
    WHERE d.BudgetMonthId = @BudgetMonthId
      AND (
            @IncludeDeleted = 1
            OR (d.IsDeleted = 0 AND d.ParticipationStatus <> 'removed')
          )
    ORDER BY
        d.IsDeleted ASC,
        d.SortOrder,
        d.Balance DESC,
        d.Name,
        d.Id;";

    private const string GetDebtForMutation = @"
    SELECT
        d.Id,
        d.BudgetMonthId,
        d.SourceDebtId,
        d.Name,
        d.Type,
        d.Balance,
        d.Apr,
        d.MonthlyFee,
        d.MinPayment,
        CAST(d.TermMonths AS SIGNED) AS TermMonths,
        d.MonthlyPayment,
        d.Status,
        d.IsDeleted,
        d.ParticipationStatus,
        src.Status AS SourceLifecycleStatus
    FROM BudgetMonthDebt d
    LEFT JOIN Debt src ON src.Id = d.SourceDebtId
    WHERE d.BudgetMonthId = @BudgetMonthId
      AND d.Id = @MonthDebtId
    LIMIT 1;";

    private const string UpdateMonthDebtMonthlyPaymentSql = @"
    UPDATE BudgetMonthDebt
    SET
        MonthlyPayment = @MonthlyPayment,
        IsOverride = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthId = @BudgetMonthId;";

    private const string BaselineDebtExistsSql = @"
    SELECT 1
    FROM Debt
    WHERE Id = @DebtId
    LIMIT 1;";

    private const string GetBaselineDebtMonthlyPaymentSql = @"
    SELECT MonthlyPayment
    FROM Debt
    WHERE Id = @DebtId
    LIMIT 1;";

    private const string UpdateBaselineDebtMonthlyPaymentSql = @"
    UPDATE Debt
    SET
        MonthlyPayment = @MonthlyPayment,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @DebtId;";

    // --- Debt PR 2: create + edit-metadata SQL ---------------------------

    // Resolves the owning `Budget.Id` for a given `BudgetMonth.Id`. The create
    // handler needs this only when scope writes a baseline plan row, but the
    // single-row read keeps the cheap path cheap by sitting alongside the meta
    // query rather than overloading it.
    private const string GetBudgetMonthForDebtCreateSql = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.BudgetId AS BudgetId
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    // Status defaults to 'active' via column DDL. Setting it explicitly here so
    // the SQL is self-documenting and stays robust to future column re-orders.
    private const string InsertBaselineDebtSql = @"
    INSERT INTO Debt
    (
        Id,
        BudgetId,
        Name,
        Type,
        Balance,
        Apr,
        MonthlyFee,
        MinPayment,
        TermMonths,
        MonthlyPayment,
        Status,
        CreatedAt,
        CreatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetId,
        @Name,
        @Type,
        @Balance,
        @Apr,
        @MonthlyFee,
        @MinPayment,
        @TermMonths,
        @MonthlyPayment,
        'active',
        @UtcNow,
        @ActorPersoid
    );";

    // Forced defaults for editor-created month rows:
    //   Status              = 'active'    — never closed at birth
    //   ParticipationStatus = 'included'  — counts in monthly debt totals immediately
    //   IsOverride          = 0           — not an override of a materialized baseline
    //   IsDeleted           = 0           — not soft-deleted
    //   ClosedAt/ClosedReason = NULL      — lifecycle hasn't ended
    //   ParticipationChangedAt/Reason = NULL — participation hasn't moved off the default
    private const string InsertMonthDebtSql = @"
    INSERT INTO BudgetMonthDebt
    (
        Id,
        BudgetMonthId,
        SourceDebtId,
        Name,
        Type,
        Balance,
        Apr,
        MonthlyFee,
        MinPayment,
        TermMonths,
        MonthlyPayment,
        OpenedAt,
        Status,
        ClosedAt,
        ClosedReason,
        IsOverride,
        IsDeleted,
        ParticipationStatus,
        ParticipationChangedAt,
        ParticipationReason,
        SortOrder,
        CreatedAt,
        CreatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthId,
        @SourceDebtId,
        @Name,
        @Type,
        @Balance,
        @Apr,
        @MonthlyFee,
        @MinPayment,
        @TermMonths,
        @MonthlyPayment,
        @UtcNow,
        'active',
        NULL,
        NULL,
        0,
        0,
        'included',
        NULL,
        NULL,
        @SortOrder,
        @UtcNow,
        @ActorPersoid
    );";

    // Snapshot read for plan-writing detail patches. Returns enough metadata
    // to populate the audit `sourceValuesBefore` payload honestly — i.e.
    // straight from the plan row, never inferred from the month row.
    private const string GetBaselineDebtSnapshotSql = @"
    SELECT
        Id,
        Name,
        Type,
        Balance,
        Apr,
        MonthlyFee,
        MinPayment,
        CAST(TermMonths AS SIGNED) AS TermMonths,
        MonthlyPayment,
        Status
    FROM Debt
    WHERE Id = @DebtId
    LIMIT 1;";

    // Detail edit on a month row. Balance is intentionally absent — PR 3
    // owns the balance-adjustment command. `IsOverride = 1` because any
    // manual edit to the month row diverges it from the materialized
    // baseline, mirroring the planned-payment update.
    private const string UpdateMonthDebtDetailsSql = @"
    UPDATE BudgetMonthDebt
    SET
        Name = @Name,
        Type = @Type,
        Apr = @Apr,
        MonthlyFee = @MonthlyFee,
        MinPayment = @MinPayment,
        TermMonths = @TermMonths,
        MonthlyPayment = @MonthlyPayment,
        IsOverride = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthId = @BudgetMonthId;";

    // Detail edit on a baseline plan row. Balance, source lifecycle, and the
    // lifecycle timestamps (PaidOffAt / ArchivedAt / DeletedAt / LifecycleReason)
    // are intentionally absent — those are owned by PR 3 (balance) and PR 4
    // (lifecycle commands) respectively.
    private const string UpdateBaselineDebtDetailsSql = @"
    UPDATE Debt
    SET
        Name = @Name,
        Type = @Type,
        Apr = @Apr,
        MonthlyFee = @MonthlyFee,
        MinPayment = @MinPayment,
        TermMonths = @TermMonths,
        MonthlyPayment = @MonthlyPayment,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @DebtId;";

    // --- Debt PR 3: balance-adjustment SQL --------------------------------

    private const string GetBaselineDebtBalanceSql = @"
    SELECT Balance
    FROM Debt
    WHERE Id = @DebtId
    LIMIT 1;";

    // Sets `Balance` and nothing else (besides the audit columns + IsOverride).
    // `IsOverride = 1` mirrors the planned-payment and detail patches: any
    // manual touch of the month row diverges it from the materialized
    // baseline, regardless of which column moved.
    private const string UpdateMonthDebtBalanceSql = @"
    UPDATE BudgetMonthDebt
    SET
        Balance = @Balance,
        IsOverride = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthId = @BudgetMonthId;";

    // Sets `Balance` and audit columns only. Lifecycle stays put — paid-off
    // is a PR 4 transition that may, separately, drive balance to zero by
    // reusing the same SQL.
    private const string UpdateBaselineDebtBalanceSql = @"
    UPDATE Debt
    SET
        Balance = @Balance,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @DebtId;";

    // --- Debt PR 4: lifecycle / participation SQL -------------------------

    // Lifecycle snapshot for an existing `Debt` row. `BudgetId` is selected
    // because mark-paid-off-with-zero needs it to write a `DebtBalanceEvent`
    // row when the balance side fires.
    private const string GetSourceDebtLifecycleSql = @"
    SELECT
        Id,
        BudgetId,
        Status,
        Balance,
        PaidOffAt,
        ArchivedAt,
        DeletedAt,
        LifecycleReason
    FROM Debt
    WHERE Id = @DebtId
    LIMIT 1;";

    // Participation toggle. `ParticipationChangedAt` always reflects the
    // current write so the FE can show the timestamp on "Ingår inte denna
    // månad" without joining audit history. `IsDeleted` mirrors the new
    // participation vocabulary so legacy reads still gate correctly:
    //   participation = removed     → IsDeleted = 1
    //   participation = included / notIncluded → IsDeleted = 0
    //
    // The legacy `Status` column is intentionally not written here; that
    // column remains for backward compatibility but no longer drives
    // editor logic (see DDL comment in 04-MonthlyLifeCycle.sql). Planned
    // payment, balance, and IsOverride are also untouched — participation
    // is metadata about whether a payment counts, not the payment itself.
    private const string UpdateMonthDebtParticipationSql = @"
    UPDATE BudgetMonthDebt
    SET
        ParticipationStatus    = @ParticipationStatus,
        ParticipationChangedAt = @UtcNow,
        ParticipationReason    = @ParticipationReason,
        IsDeleted              = @IsDeletedMirror,
        UpdatedAt              = @UtcNow,
        UpdatedByUserId        = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthId = @BudgetMonthId;";

    // Lifecycle transition. The `CASE`-style assignments only overwrite the
    // matching timestamp; a restore (Status = 'active', all timestamps NULL)
    // intentionally writes NULL into the active fields so the FE can read
    // "current lifecycle" from `Status` without a parallel set of stale
    // timestamps. Historical lifecycle facts live in
    // `BudgetMonthChangeEvent` audit rows, not here.
    //
    // We write timestamps unconditionally based on the model so the caller
    // controls preservation. The handlers explicitly pass the existing
    // historical timestamps for non-matching transitions; this keeps the
    // SQL simple and testable.
    private const string UpdateBaselineDebtLifecycleSql = @"
    UPDATE Debt
    SET
        Status          = @Status,
        PaidOffAt       = @PaidOffAt,
        ArchivedAt      = @ArchivedAt,
        DeletedAt       = @DeletedAt,
        LifecycleReason = @LifecycleReason,
        UpdatedAt       = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @DebtId;";
}
