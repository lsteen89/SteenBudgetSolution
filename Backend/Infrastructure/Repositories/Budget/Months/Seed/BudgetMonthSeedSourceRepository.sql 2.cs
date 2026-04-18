
namespace Backend.Infrastructure.Repositories.Budget.Months.Seed;

public sealed partial class BudgetMonthSeedSourceRepository
{
    private const string GetIncomeSql = @"
    SELECT
        i.Id                 AS Id,
        i.NetSalaryMonthly   AS NetSalaryMonthly,
        i.SalaryFrequency    AS SalaryFrequency
    FROM Income i
    WHERE i.BudgetId = @BudgetId
    LIMIT 1;";

    private const string GetActiveSideHustlesSql = @"
    SELECT
        ish.Id               AS Id,
        ish.Name             AS Name,
        ish.IncomeMonthly    AS IncomeMonthly,
        ish.Frequency        AS Frequency,
        0                    AS SortOrder
    FROM IncomeSideHustle ish
    INNER JOIN Income i ON i.Id = ish.IncomeId
    WHERE i.BudgetId = @BudgetId
      AND ish.IsActive = 1
      AND ish.EndedAt IS NULL
    ORDER BY ish.CreatedAt, ish.Name;";

    private const string GetActiveHouseholdMembersSql = @"
    SELECT
        ihm.Id               AS Id,
        ihm.Name             AS Name,
        ihm.IncomeMonthly    AS IncomeMonthly,
        ihm.Frequency        AS Frequency,
        0                    AS SortOrder
    FROM IncomeHouseholdMember ihm
    INNER JOIN Income i ON i.Id = ihm.IncomeId
    WHERE i.BudgetId = @BudgetId
      AND ihm.IsActive = 1
      AND ihm.EndedAt IS NULL
    ORDER BY ihm.CreatedAt, ihm.Name;";

    private const string GetActiveExpenseItemsSql = @"
    SELECT
        ei.Id                AS Id,
        ei.CategoryId        AS CategoryId,
        ei.Name              AS Name,
        ei.AmountMonthly     AS AmountMonthly,
        0                    AS SortOrder
    FROM ExpenseItem ei
    WHERE ei.BudgetId = @BudgetId
      AND ei.IsActive = 1
      AND ei.EndedAt IS NULL
    ORDER BY ei.CreatedAt, ei.Name;";

    private const string GetSavingsSql = @"
    SELECT
        Id,
        MonthlySavings
    FROM Savings
    WHERE BudgetId = @BudgetId
    LIMIT 1;";

    private const string GetActiveSavingsGoalsSql = @"
    SELECT
        sg.Id,
        sg.Name,
        sg.TargetAmount,
        sg.TargetDate,
        sg.AmountSaved,
        sg.MonthlyContribution,
        sg.OpenedAt,
        sg.Status,
        sg.ClosedAt,
        sg.ClosedReason
    FROM SavingsGoal sg
    INNER JOIN Savings s ON s.Id = sg.SavingsId
    WHERE s.BudgetId = @BudgetId
    AND sg.Status = 'active'
    ORDER BY sg.CreatedAt, sg.Id;";

    private const string GetActiveDebtsSql = @"
    SELECT
        Id,
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
        ClosedReason
    FROM Debt
    WHERE BudgetId = @BudgetId
    AND Status = 'active'
    ORDER BY CreatedAt, Id;";
}