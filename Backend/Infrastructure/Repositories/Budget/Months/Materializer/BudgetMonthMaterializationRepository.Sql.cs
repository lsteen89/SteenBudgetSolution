
namespace Backend.Infrastructure.Repositories.Budget.Months.Materializer;

public sealed partial class BudgetMonthMaterializationRepository
{
    private const string HasMaterializedIncomeSql = @"
    SELECT EXISTS(
        SELECT 1
        FROM BudgetMonthIncome
        WHERE BudgetMonthId = @BudgetMonthId
    );";

    private const string GetBudgetMonthIncomeIdSql = @"
    SELECT Id
    FROM BudgetMonthIncome
    WHERE BudgetMonthId = @BudgetMonthId
    LIMIT 1;";

    private const string InsertBudgetMonthIncomeSql = @"
    INSERT INTO BudgetMonthIncome
    (
        Id,
        BudgetMonthId,
        SourceIncomeId,
        NetSalaryMonthly,
        SalaryFrequency,
        IncomePaymentDayType,
        IncomePaymentDay,
        IsOverride,
        IsDeleted,
        CreatedAt,
        UpdatedAt,
        CreatedByUserId,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthId,
        @SourceIncomeId,
        @NetSalaryMonthly,
        @SalaryFrequency,
        @IncomePaymentDayType,
        @IncomePaymentDay,
        0,
        0,
        @NowUtc,
        NULL,
        @ActorPersoid,
        NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";

    private const string InsertBudgetMonthIncomeSideHustleSql = @"
    INSERT INTO BudgetMonthIncomeSideHustle
    (
        Id,
        BudgetMonthIncomeId,
        SourceSideHustleId,
        Name,
        IncomeMonthly,
        Frequency,
        IsActive,
        IsOverride,
        IsDeleted,
        SortOrder,
        CreatedAt,
        UpdatedAt,
        CreatedByUserId,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthIncomeId,
        @SourceSideHustleId,
        @Name,
        @IncomeMonthly,
        @Frequency,
        1,
        0,
        0,
        @SortOrder,
        @NowUtc,
        NULL,
        @ActorPersoid,
        NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";

    private const string InsertBudgetMonthIncomeHouseholdMemberSql = @"
    INSERT INTO BudgetMonthIncomeHouseholdMember
    (
        Id,
        BudgetMonthIncomeId,
        SourceHouseholdMemberId,
        Name,
        IncomeMonthly,
        Frequency,
        IsActive,
        IsOverride,
        IsDeleted,
        SortOrder,
        CreatedAt,
        UpdatedAt,
        CreatedByUserId,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthIncomeId,
        @SourceHouseholdMemberId,
        @Name,
        @IncomeMonthly,
        @Frequency,
        1,
        0,
        0,
        @SortOrder,
        @NowUtc,
        NULL,
        @ActorPersoid,
        NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";

    private const string InsertBudgetMonthExpenseItemSql = @"
    INSERT INTO BudgetMonthExpenseItem
    (
        Id,
        BudgetMonthId,
        SourceExpenseItemId,
        CategoryId,
        Name,
        AmountMonthly,
        IsActive,
        IsOverride,
        IsDeleted,
        SortOrder,
        CreatedAt,
        UpdatedAt,
        CreatedByUserId,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthId,
        @SourceExpenseItemId,
        @CategoryId,
        @Name,
        @AmountMonthly,
        1,
        0,
        0,
        @SortOrder,
        @NowUtc,
        NULL,
        @ActorPersoid,
        NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";

    private const string HasMaterializedSavingsSql = @"
    SELECT EXISTS(
        SELECT 1
        FROM BudgetMonthSavings
        WHERE BudgetMonthId = @BudgetMonthId
    );";

    private const string GetBudgetMonthSavingsIdSql = @"
    SELECT Id
    FROM BudgetMonthSavings
    WHERE BudgetMonthId = @BudgetMonthId
    LIMIT 1;";

    private const string InsertBudgetMonthSavingsSql = @"
    INSERT INTO BudgetMonthSavings
    (
        Id,
        BudgetMonthId,
        SourceSavingsId,
        MonthlySavings,
        IsOverride,
        IsDeleted,
        CreatedAt,
        UpdatedAt,
        CreatedByUserId,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthId,
        @SourceSavingsId,
        @MonthlySavings,
        0,
        0,
        @NowUtc,
        NULL,
        @ActorPersoid,
        NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";

    private const string InsertBudgetMonthSavingsGoalSql = @"
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
        ClosedAt,
        ClosedReason,
        IsOverride,
        IsDeleted,
        SortOrder,
        CreatedAt,
        UpdatedAt,
        CreatedByUserId,
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
        @ClosedAt,
        @ClosedReason,
        0,
        0,
        @SortOrder,
        @NowUtc,
        NULL,
        @ActorPersoid,
        NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";
    private const string InsertBudgetMonthDebtSql = @"
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
        OpenedAt,
        Status,
        ClosedAt,
        ClosedReason,
        IsOverride,
        IsDeleted,
        SortOrder,
        CreatedAt,
        UpdatedAt,
        CreatedByUserId,
        UpdatedByUserId
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
        @OpenedAt,
        @Status,
        @ClosedAt,
        @ClosedReason,
        0,
        0,
        @SortOrder,
        @NowUtc,
        NULL,
        @ActorPersoid,
        NULL
    )
    ON DUPLICATE KEY UPDATE
        UpdatedAt = UpdatedAt;";
}
