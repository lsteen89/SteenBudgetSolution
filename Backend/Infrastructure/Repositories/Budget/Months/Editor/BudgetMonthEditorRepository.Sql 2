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

    private const string GetExpenseItemEditorRows = @"
    SELECT
        bmei.Id,
        bmei.SourceExpenseItemId,
        bmei.CategoryId,
        bmei.Name,
        bmei.AmountMonthly,
        bmei.IsActive,
        bmei.IsDeleted
    FROM BudgetMonthExpenseItem bmei
    WHERE bmei.BudgetMonthId = @BudgetMonthId
      AND (@IncludeDeleted = 1 OR bmei.IsDeleted = 0)
    ORDER BY bmei.IsDeleted ASC, bmei.Name ASC;";
}