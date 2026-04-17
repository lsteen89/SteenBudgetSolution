namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Expense;

public sealed partial class BudgetMonthExpenseItemMutationRepository
{
    private const string GetExpenseItemForMutation = @"
    SELECT
        bmei.Id,
        bmei.BudgetMonthId,
        bmei.SourceExpenseItemId,
        bmei.CategoryId,
        bmei.Name,
        bmei.AmountMonthly,
        bmei.IsActive,
        bmei.IsDeleted
    FROM BudgetMonthExpenseItem bmei
    WHERE bmei.BudgetMonthId = @BudgetMonthId
      AND bmei.Id = @MonthExpenseItemId
    LIMIT 1;";

    private const string ExpenseCategoryExists = @"
    SELECT 1
    FROM ExpenseCategory ec
    WHERE ec.Id = @CategoryId
    LIMIT 1;";

    private const string UpdateMonthExpenseItem = @"
    UPDATE BudgetMonthExpenseItem
    SET
        CategoryId = @CategoryId,
        Name = @Name,
        AmountMonthly = @AmountMonthly,
        IsActive = @IsActive,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE BudgetMonthId = @BudgetMonthId
    AND Id = @Id;";

    private const string InsertMonthExpenseItem = @"
    INSERT INTO BudgetMonthExpenseItem
    (
        Id,
        BudgetMonthId,
        SourceExpenseItemId,
        CategoryId,
        Name,
        AmountMonthly,
        IsActive,
        IsDeleted,
        CreatedAt,
        CreatedByUserId,
        UpdatedAt,
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
        @IsActive,
        @IsDeleted,
        @UtcNow,
        @ActorPersoid,
        @UtcNow,
        @ActorPersoid
    );";

    private const string BaselineExpenseItemExists = @"
    SELECT 1
    FROM ExpenseItem ei
    WHERE ei.Id = @ExpenseItemId
    LIMIT 1;";

    private const string UpdateBaselineExpenseItem = @"
    UPDATE ExpenseItem
    SET
        CategoryId = @CategoryId,
        Name = @Name,
        AmountMonthly = @AmountMonthly,
        IsActive = @IsActive,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @ExpenseItemId;";

    private const string SoftDeleteMonthExpenseItem = @"
    UPDATE BudgetMonthExpenseItem
    SET
        IsDeleted = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE BudgetMonthId = @BudgetMonthId
    AND Id = @MonthExpenseItemId
    AND IsDeleted = 0;

    SELECT ROW_COUNT();";

    private const string GetBudgetMonthMeta = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.YearMonth,
        bm.Status
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";
}