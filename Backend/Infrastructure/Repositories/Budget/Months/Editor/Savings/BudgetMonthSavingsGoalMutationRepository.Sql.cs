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
        g.IsDeleted
    FROM BudgetMonthSavingsGoal g
    JOIN BudgetMonthSavings s
        ON s.Id = g.BudgetMonthSavingsId
    WHERE s.BudgetMonthId = @BudgetMonthId
      AND s.IsDeleted = 0
      AND (@IncludeDeleted = 1 OR g.IsDeleted = 0)
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
