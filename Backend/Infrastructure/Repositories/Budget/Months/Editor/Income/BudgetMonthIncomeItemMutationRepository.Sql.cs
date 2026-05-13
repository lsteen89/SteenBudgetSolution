namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Income;

public sealed partial class BudgetMonthIncomeItemMutationRepository
{
    private const string GetBudgetMonthMeta = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.YearMonth,
        bm.Status
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    private const string GetBudgetMonthIncomeId = @"
    SELECT Id
    FROM BudgetMonthIncome
    WHERE BudgetMonthId = @BudgetMonthId
      AND IsDeleted = 0
    LIMIT 1;";

    private const string IncomeItemRowsProjection = @"
    SELECT
        bmi.Id,
        bmi.BudgetMonthId,
        bmi.Id AS BudgetMonthIncomeId,
        bmi.SourceIncomeId AS SourceIncomeItemId,
        'salary' AS Kind,
        NULL AS Name,
        bmi.NetSalaryMonthly AS AmountMonthly,
        TRUE AS IsActive,
        bmi.IsDeleted
    FROM BudgetMonthIncome bmi
    WHERE bmi.BudgetMonthId = @BudgetMonthId

    UNION ALL

    SELECT
        ish.Id,
        bmi.BudgetMonthId,
        bmi.Id AS BudgetMonthIncomeId,
        ish.SourceSideHustleId AS SourceIncomeItemId,
        'sideHustle' AS Kind,
        ish.Name,
        ish.IncomeMonthly AS AmountMonthly,
        ish.IsActive,
        ish.IsDeleted
    FROM BudgetMonthIncome bmi
    JOIN BudgetMonthIncomeSideHustle ish
        ON ish.BudgetMonthIncomeId = bmi.Id
    WHERE bmi.BudgetMonthId = @BudgetMonthId
      AND bmi.IsDeleted = 0

    UNION ALL

    SELECT
        ihm.Id,
        bmi.BudgetMonthId,
        bmi.Id AS BudgetMonthIncomeId,
        ihm.SourceHouseholdMemberId AS SourceIncomeItemId,
        'householdMember' AS Kind,
        ihm.Name,
        ihm.IncomeMonthly AS AmountMonthly,
        ihm.IsActive,
        ihm.IsDeleted
    FROM BudgetMonthIncome bmi
    JOIN BudgetMonthIncomeHouseholdMember ihm
        ON ihm.BudgetMonthIncomeId = bmi.Id
    WHERE bmi.BudgetMonthId = @BudgetMonthId
      AND bmi.IsDeleted = 0";

    private const string GetIncomeItemEditorRows = $@"
    SELECT
        incomeRows.Id,
        incomeRows.SourceIncomeItemId,
        incomeRows.Kind,
        incomeRows.Name,
        incomeRows.AmountMonthly,
        incomeRows.IsActive,
        incomeRows.IsDeleted
    FROM ({IncomeItemRowsProjection}) incomeRows
    WHERE (@IncludeDeleted = 1 OR incomeRows.IsDeleted = 0)
    ORDER BY
        CASE incomeRows.Kind
            WHEN 'salary' THEN 0
            WHEN 'householdMember' THEN 1
            ELSE 2
        END,
        incomeRows.IsDeleted ASC,
        incomeRows.Name ASC;";

    private const string GetIncomeItemForMutation = $@"
    SELECT
        incomeRows.Id,
        incomeRows.BudgetMonthId,
        incomeRows.BudgetMonthIncomeId,
        incomeRows.SourceIncomeItemId,
        incomeRows.Kind,
        incomeRows.Name,
        incomeRows.AmountMonthly,
        incomeRows.IsActive,
        incomeRows.IsDeleted
    FROM ({IncomeItemRowsProjection}) incomeRows
    WHERE incomeRows.Id = @MonthIncomeItemId
    LIMIT 1;";

    private const string InsertMonthSideHustleIncomeItem = @"
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
        CreatedAt,
        CreatedByUserId,
        UpdatedAt,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthIncomeId,
        @SourceIncomeItemId,
        @Name,
        @AmountMonthly,
        0,
        @IsActive,
        1,
        @IsDeleted,
        @UtcNow,
        @ActorPersoid,
        @UtcNow,
        @ActorPersoid
    );";

    private const string InsertMonthHouseholdMemberIncomeItem = @"
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
        CreatedAt,
        CreatedByUserId,
        UpdatedAt,
        UpdatedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthIncomeId,
        @SourceIncomeItemId,
        @Name,
        @AmountMonthly,
        0,
        @IsActive,
        1,
        @IsDeleted,
        @UtcNow,
        @ActorPersoid,
        @UtcNow,
        @ActorPersoid
    );";

    private const string UpdateMonthSalaryIncomeItem = @"
    UPDATE BudgetMonthIncome
    SET
        NetSalaryMonthly = @AmountMonthly,
        IsOverride = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthId = (
        SELECT BudgetMonthId
        FROM BudgetMonthIncome
        WHERE Id = @BudgetMonthIncomeId
        LIMIT 1
      );";

    private const string UpdateMonthSideHustleIncomeItem = @"
    UPDATE BudgetMonthIncomeSideHustle
    SET
        Name = @Name,
        IncomeMonthly = @AmountMonthly,
        IsActive = @IsActive,
        IsOverride = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthIncomeId = @BudgetMonthIncomeId;";

    private const string UpdateMonthHouseholdMemberIncomeItem = @"
    UPDATE BudgetMonthIncomeHouseholdMember
    SET
        Name = @Name,
        IncomeMonthly = @AmountMonthly,
        IsActive = @IsActive,
        IsOverride = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthIncomeId = @BudgetMonthIncomeId;";

    private const string BaselineSalaryIncomeItemExists = @"
    SELECT 1
    FROM Income
    WHERE Id = @IncomeItemId
    LIMIT 1;";

    private const string BaselineSideHustleIncomeItemExists = @"
    SELECT 1
    FROM IncomeSideHustle
    WHERE Id = @IncomeItemId
    LIMIT 1;";

    private const string BaselineHouseholdMemberIncomeItemExists = @"
    SELECT 1
    FROM IncomeHouseholdMember
    WHERE Id = @IncomeItemId
    LIMIT 1;";

    private const string UpdateBaselineSalaryIncomeItem = @"
    UPDATE Income
    SET
        NetSalaryMonthly = @AmountMonthly,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @IncomeItemId;";

    private const string UpdateBaselineSideHustleIncomeItem = @"
    UPDATE IncomeSideHustle
    SET
        Name = @Name,
        IncomeMonthly = @AmountMonthly,
        IsActive = @IsActive,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @IncomeItemId;";

    private const string UpdateBaselineHouseholdMemberIncomeItem = @"
    UPDATE IncomeHouseholdMember
    SET
        Name = @Name,
        IncomeMonthly = @AmountMonthly,
        IsActive = @IsActive,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @IncomeItemId;";

    private const string SoftDeleteMonthSideHustleIncomeItem = @"
    UPDATE BudgetMonthIncomeSideHustle
    SET
        IsDeleted = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE BudgetMonthIncomeId = @BudgetMonthIncomeId
      AND Id = @MonthIncomeItemId
      AND IsDeleted = 0;

    SELECT ROW_COUNT();";

    private const string SoftDeleteMonthHouseholdMemberIncomeItem = @"
    UPDATE BudgetMonthIncomeHouseholdMember
    SET
        IsDeleted = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE BudgetMonthIncomeId = @BudgetMonthIncomeId
      AND Id = @MonthIncomeItemId
      AND IsDeleted = 0;

    SELECT ROW_COUNT();";
}
