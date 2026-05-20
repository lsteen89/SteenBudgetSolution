using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;

namespace Backend.Infrastructure.Repositories.Budget.Months;

public sealed partial class BudgetMonthRepository
{

    private const string GetBudgetIdByPersoid = @"
    SELECT b.Id
    FROM Budget b
    WHERE b.Persoid = @Persoid
    LIMIT 1;";

    private const string GetMonths = @"
    SELECT
        bm.Id,
        bm.BudgetId,
        bm.YearMonth,
        bm.Status,
        bm.OpenedAt,
        bm.ClosedAt,
        bm.CarryOverMode,
        bm.CarryOverAmount
    FROM BudgetMonth bm
    WHERE bm.BudgetId = @BudgetId
    ORDER BY bm.YearMonth DESC;";

    private const string GetOpenMonths = @"
    SELECT
        bm.Id,
        bm.BudgetId,
        bm.YearMonth,
        bm.Status,
        bm.OpenedAt,
        bm.ClosedAt,
        bm.CarryOverMode,
        bm.CarryOverAmount
    FROM BudgetMonth bm
    WHERE bm.BudgetId = @BudgetId
    AND bm.Status = 'open'
    ORDER BY bm.OpenedAt DESC;";

    // IMPORTANT:
    // - Uses UX(BudgetId, YearMonth) for idempotency
    // - If row exists, do nothing (keeps existing row untouched)
    private const string InsertOpenMonthIdempotent = @"
    INSERT INTO BudgetMonth
    (
        Id, BudgetId, YearMonth, Status,
        OpenedAt, ClosedAt,
        CarryOverMode, CarryOverAmount,
        CreatedAt, UpdatedAt, CreatedByUserId, UpdatedByUserId
    )
    VALUES
    (
        @Id, @BudgetId, @YearMonth, @Status,
        @NowUtc, NULL,
        @CarryOverMode, @CarryOverAmount,
        @NowUtc, NULL, @UserId, NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";

    private const string InsertSkippedMonthIdempotent = @"
    INSERT INTO BudgetMonth
    (
        Id, BudgetId, YearMonth, Status,
        OpenedAt, ClosedAt,
        CarryOverMode, CarryOverAmount,
        CreatedAt, UpdatedAt, CreatedByUserId, UpdatedByUserId
    )
    VALUES
    (
        @Id, @BudgetId, @YearMonth, @Status,
        @NowUtc, @NowUtc,
        'none', NULL,
        @NowUtc, NULL, @UserId, NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";

    // Idempotent close: only closes if still open
    private const string CloseOpenMonthWithSnapshot = @"
    UPDATE BudgetMonth
    SET
        Status                           = 'closed',
        ClosedAt                         = @NowUtc,
        SnapshotTotalIncomeMonthly       = @SnapshotTotalIncomeMonthly,
        SnapshotTotalExpensesMonthly     = @SnapshotTotalExpensesMonthly,
        SnapshotTotalSavingsMonthly      = @SnapshotTotalSavingsMonthly,
        SnapshotTotalDebtPaymentsMonthly = @SnapshotTotalDebtPaymentsMonthly,
        SnapshotFinalBalanceMonthly      = @SnapshotFinalBalanceMonthly,
        UpdatedByUserId                  = @UserId
    WHERE Id = @BudgetMonthId
    AND Status = 'open';";

    private const string UpdateCarryOverSettings = @"
    UPDATE BudgetMonth
    SET
        CarryOverMode  = @CarryOverMode,
        CarryOverAmount = @CarryOverAmount,
        UpdatedAt      = @NowUtc,
        UpdatedByUserId = @UserId
    WHERE Id = @BudgetMonthId
      AND Status = 'open';";

    private const string MarkMonthSkipped = @"
    UPDATE BudgetMonth
    SET
        Status          = 'skipped',
        ClosedAt        = @NowUtc,
        UpdatedByUserId = @UserId
    WHERE Id = @BudgetMonthId
    AND Status = 'open';";

    private const string UpdateBudgetMonthIncomePaymentTiming = @"
    UPDATE BudgetMonthIncome
    SET
        IncomePaymentDayType = @IncomePaymentDayType,
        IncomePaymentDay = @IncomePaymentDay,
        UpdatedAt = @NowUtc,
        UpdatedByUserId = @ActorPersoid
    WHERE BudgetMonthId = @BudgetMonthId;";

    private const string GetBudgetMonthIncomePaymentTiming = @"
    SELECT
        Id,
        IncomePaymentDayType,
        CAST(IncomePaymentDay AS SIGNED) AS IncomePaymentDay
    FROM BudgetMonthIncome
    WHERE BudgetMonthId = @BudgetMonthId
    LIMIT 1;";

    private const string GetMonth = @"
    SELECT
        bm.Id,
        bm.BudgetId,
        bm.YearMonth,
        bm.Status,
        bm.OpenedAt,
        bm.ClosedAt,
        bm.CarryOverMode,
        bm.CarryOverAmount,

        bm.SnapshotTotalIncomeMonthly,
        bm.SnapshotTotalExpensesMonthly,
        bm.SnapshotTotalSavingsMonthly,
        bm.SnapshotTotalDebtPaymentsMonthly,
        bm.SnapshotFinalBalanceMonthly
    FROM BudgetMonth bm
    WHERE bm.BudgetId = @BudgetId
    AND bm.YearMonth = @YearMonth
    LIMIT 1;";

    private const string GetPreviousComparableYearMonth = @"
    SELECT
        bm.YearMonth
    FROM BudgetMonth bm
    WHERE bm.BudgetId = @BudgetId
      AND bm.YearMonth < @YearMonth
      AND bm.Status = 'closed'
      AND bm.SnapshotTotalIncomeMonthly IS NOT NULL
      AND bm.SnapshotTotalExpensesMonthly IS NOT NULL
      AND bm.SnapshotTotalSavingsMonthly IS NOT NULL
      AND bm.SnapshotTotalDebtPaymentsMonthly IS NOT NULL
      AND bm.SnapshotFinalBalanceMonthly IS NOT NULL
    ORDER BY bm.YearMonth DESC
    LIMIT 1;";

    private const string GetExpenseCategoryTotals = @"
    SELECT
        c.Id AS CategoryId,
        c.Name AS CategoryName,
        COALESCE(SUM(e.AmountMonthly), 0) AS TotalMonthlyAmount
    FROM BudgetMonthExpenseItem e
    JOIN ExpenseCategory c ON c.Id = e.CategoryId
    WHERE e.BudgetMonthId = @BudgetMonthId
      AND e.IsDeleted = 0
      AND e.IsActive = 1
      AND (
          e.SubscriptionLifecycleStatus IS NULL
          OR e.SubscriptionLifecycleStatus = @ActiveSubscriptionLifecycleStatus
      )
    GROUP BY c.Id, c.Name
    ORDER BY c.Name;";

    private const string GetSubscriptions = @"
    SELECT
        e.Id,
        e.SourceExpenseItemId,
        e.Name,
        e.AmountMonthly,
        e.SubscriptionLifecycleStatus
    FROM BudgetMonthExpenseItem e
    JOIN ExpenseCategory c ON c.Id = e.CategoryId
    WHERE e.BudgetMonthId = @BudgetMonthId
      AND c.Name = 'Subscription'
      AND e.IsDeleted = 0
    ORDER BY e.Name, e.Id;";

    private const string GetSavingsGoals = @"
    SELECT
        g.Id,
        g.SourceSavingsGoalId,
        g.Name,
        g.TargetAmount,
        g.TargetDate,
        g.AmountSaved,
        g.MonthlyContribution
    FROM BudgetMonthSavings s
    JOIN BudgetMonthSavingsGoal g
        ON g.BudgetMonthSavingsId = s.Id
    WHERE s.BudgetMonthId = @BudgetMonthId
      AND s.IsDeleted = 0
      AND g.IsDeleted = 0
      AND g.Status = 'active'
    ORDER BY g.SortOrder, g.CreatedAt, g.Id;";

    // Savings goals that the month closed with ClosedReason='completed'.
    // Reads strictly from BudgetMonthSavingsGoal (not the baseline plan) so
    // the recap reflects exactly the goals that were tied off when this
    // month was closed.
    private const string GetCompletedSavingsGoals = @"
    SELECT
        g.Id,
        g.SourceSavingsGoalId,
        g.Name,
        g.TargetAmount,
        g.AmountSaved,
        g.MonthlyContribution,
        g.ClosedAt
    FROM BudgetMonthSavings s
    JOIN BudgetMonthSavingsGoal g
        ON g.BudgetMonthSavingsId = s.Id
    WHERE s.BudgetMonthId = @BudgetMonthId
      AND s.IsDeleted = 0
      AND g.IsDeleted = 0
      AND g.Status = 'closed'
      AND g.ClosedReason = 'completed'
    ORDER BY g.ClosedAt, g.SortOrder, g.CreatedAt, g.Id;";

    private const string GetDebts = @"
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
        d.MonthlyPayment
    FROM BudgetMonthDebt d
    WHERE d.BudgetMonthId = @BudgetMonthId
      AND d.IsDeleted = 0
      AND d.Status = 'active'
    ORDER BY d.SortOrder, d.Balance DESC, d.Name;";

    const string ExistsAnyMonths = """
        SELECT EXISTS(
            SELECT 1
            FROM BudgetMonth
            WHERE BudgetId = @BudgetId
            LIMIT 1
        );
    """;
    private const string GetBudgetMonthLookupByBudgetIdAndYearMonth = @"
    SELECT
        bm.Id,
        bm.BudgetId,
        bm.YearMonth,
        bm.Status
    FROM BudgetMonth bm
    WHERE bm.BudgetId = @BudgetId
      AND bm.YearMonth = @YearMonth
    LIMIT 1;";

    // Reads the most recent carry-over-applied lifecycle event whose
    // RelatedBudgetMonthId points back to the closed source month. The joined
    // BudgetMonth row is the target month the carry-over was applied to.
    private const string GetCarryOverOutcomeForClosedMonth = @"
    SELECT
        e.CarryOverMode               AS Mode,
        COALESCE(e.CarryOverAmount, 0) AS Amount,
        bm.YearMonth                   AS TargetYearMonth
    FROM BudgetMonthLifecycleEvent e
    JOIN BudgetMonth bm ON bm.Id = e.BudgetMonthId
    WHERE e.EventType = @EventType
      AND e.RelatedBudgetMonthId = @SourceBudgetMonthId
    ORDER BY e.OccurredAt DESC
    LIMIT 1;";

}
