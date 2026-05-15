namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Debts;

public sealed partial class BudgetMonthDebtMutationRepository
{
    private const string GetBudgetMonthMeta = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.YearMonth,
        bm.Status
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    private const string GetDebtEditorRows = @"
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
        d.MonthlyPayment,
        d.Status,
        d.IsDeleted
    FROM BudgetMonthDebt d
    WHERE d.BudgetMonthId = @BudgetMonthId
      AND (@IncludeDeleted = 1 OR d.IsDeleted = 0)
    ORDER BY
        d.IsDeleted ASC,
        d.SortOrder,
        d.Balance DESC,
        d.Name,
        d.Id;";

    private const string GetDebtForMutation = @"
    SELECT
        d.Id,
        d.BudgetMonthId,
        d.SourceDebtId,
        d.Name,
        d.Type,
        d.Balance,
        d.Apr,
        d.MonthlyFee,
        d.MinPayment,
        CAST(d.TermMonths AS SIGNED) AS TermMonths,
        d.MonthlyPayment,
        d.Status,
        d.IsDeleted
    FROM BudgetMonthDebt d
    WHERE d.BudgetMonthId = @BudgetMonthId
      AND d.Id = @MonthDebtId
    LIMIT 1;";

    private const string UpdateMonthDebtMonthlyPaymentSql = @"
    UPDATE BudgetMonthDebt
    SET
        MonthlyPayment = @MonthlyPayment,
        IsOverride = 1,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @Id
      AND BudgetMonthId = @BudgetMonthId;";

    private const string BaselineDebtExistsSql = @"
    SELECT 1
    FROM Debt
    WHERE Id = @DebtId
    LIMIT 1;";

    private const string GetBaselineDebtMonthlyPaymentSql = @"
    SELECT MonthlyPayment
    FROM Debt
    WHERE Id = @DebtId
    LIMIT 1;";

    private const string UpdateBaselineDebtMonthlyPaymentSql = @"
    UPDATE Debt
    SET
        MonthlyPayment = @MonthlyPayment,
        UpdatedAt = @UtcNow,
        UpdatedByUserId = @ActorPersoid
    WHERE Id = @DebtId;";
}
