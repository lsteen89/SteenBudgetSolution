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
        'none', 0.00,
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

    private const string MarkMonthSkipped = @"
    UPDATE BudgetMonth
    SET
        Status          = 'skipped',
        ClosedAt        = @NowUtc,
        UpdatedByUserId = @UserId
    WHERE Id = @BudgetMonthId
    AND Status = 'open';";

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

    const string ExistsAnyMonths = """
        SELECT EXISTS(
            SELECT 1
            FROM BudgetMonth
            WHERE BudgetId = @BudgetId
            LIMIT 1
        );
    """;


}