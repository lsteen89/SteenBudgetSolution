namespace Backend.Infrastructure.Repositories.Budget.Months.Editor;

public sealed partial class BudgetMonthEditorRepository
{
    private const string GetMonthMeta = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.YearMonth,
        bm.Status,
        bm.CarryOverAmount,
        bm.CarryOverMode
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    // Source-plan columns are LEFT JOINed so month-only rows
    // (SourceExpenseItemId IS NULL) and rows whose source ExpenseItem was
    // hard-deleted both return NULL for the source fields. The FE uses these
    // to compute plan-vs-current-month deltas honestly. Mutations do not touch
    // these columns.
    private const string GetExpenseItemEditorRows = @"
    SELECT
        bmei.Id,
        bmei.SourceExpenseItemId,
        bmei.CategoryId,
        bmei.Name,
        bmei.AmountMonthly,
        bmei.SubscriptionLifecycleStatus,
        bmei.IsActive,
        bmei.IsDeleted,
        ei.CategoryId    AS SourceCategoryId,
        ei.Name          AS SourceName,
        ei.AmountMonthly AS SourceAmountMonthly,
        ei.IsActive      AS SourceIsActive
    FROM BudgetMonthExpenseItem bmei
    LEFT JOIN ExpenseItem ei
        ON ei.Id = bmei.SourceExpenseItemId
    WHERE bmei.BudgetMonthId = @BudgetMonthId
      AND (@IncludeDeleted = 1 OR bmei.IsDeleted = 0)
    ORDER BY bmei.IsDeleted ASC, bmei.Name ASC;";
}
