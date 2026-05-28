namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Savings;

public sealed partial class BudgetMonthBaseSavingsMutationRepository
{
    // Reuses the same shape as the goal repo's GetBudgetMonthMeta — explicit
    // columns, single row, no joins. Keeps the base-savings slice self-
    // contained so the goal repo does not have to expose anything extra.
    private const string GetBudgetMonthMetaSql = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.YearMonth,
        bm.Status
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    // The per-month savings row carries the four fields the patch handler
    // needs: row identity for the UPDATE, the nullable plan link
    // (`SourceSavingsId` IS NULL ⇒ orphan, plan scopes are rejected),
    // current `MonthlySavings` for the no-op guard, and `IsOverride` so
    // future audit/analytics can tell a real override from a baseline
    // mirror.
    private const string GetBudgetMonthBaseSavingsForEditSql = @"
    SELECT
        s.Id,
        s.SourceSavingsId,
        s.MonthlySavings,
        s.IsOverride
    FROM BudgetMonthSavings s
    WHERE s.BudgetMonthId = @BudgetMonthId
      AND s.IsDeleted = 0
    LIMIT 1;";

    // Current-month write. `IsOverride = 1` matches the goal-contribution
    // pattern: a user-initiated edit always flips the override flag, even
    // when the new value happens to match the baseline.
    private const string UpdateMonthBaseSavingsSql = @"
    UPDATE BudgetMonthSavings
    SET
        MonthlySavings  = @MonthlySavings,
        IsOverride      = 1,
        UpdatedAt       = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id;";

    // Plan-level write. Touches the budget-scoped `Savings` row only. The
    // handler guarantees `@SavingsId` is non-null and points at the source
    // row referenced by the current month's `SourceSavingsId`.
    private const string UpdateBaselineBaseSavingsSql = @"
    UPDATE Savings
    SET
        MonthlySavings  = @MonthlySavings,
        UpdatedAt       = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @SavingsId;";
}
