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
    GROUP BY c.Id, c.Name
    ORDER BY c.Name;";

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

}
