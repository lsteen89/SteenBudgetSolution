using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;

namespace Backend.Infrastructure.Repositories.Budget.BudgetDashboard;

public sealed partial class BudgetDashboardRepository
{
    private const string BudgetIdSql = @"
    SELECT Id
    FROM Budget
    WHERE Persoid = UNHEX(REPLACE(@Persoid, '-', ''))
    ORDER BY CreatedAt DESC
    LIMIT 1;
    ";

    private const string TotalsSql = @"
    SELECT
        COALESCE(i.NetSalaryMonthly, 0) AS NetSalaryMonthly,

        COALESCE((
            SELECT SUM(ish.IncomeMonthly)
            FROM IncomeSideHustle ish
            WHERE ish.IncomeId = i.Id
        ), 0) AS SideHustleMonthly,

        COALESCE((
            SELECT SUM(ihm.IncomeMonthly)
            FROM IncomeHouseholdMember ihm
            WHERE ihm.IncomeId = i.Id
        ), 0) AS HouseholdMembersMonthly,

        COALESCE((
            SELECT SUM(e.AmountMonthly)
            FROM ExpenseItem e
            WHERE e.BudgetId = b.Id
        ), 0) AS TotalExpensesMonthly,

        COALESCE((
            SELECT s.MonthlySavings
            FROM Savings s
            WHERE s.BudgetId = b.Id
            LIMIT 1
        ), 0) AS TotalSavingsMonthly,

        COALESCE((
            SELECT SUM(d.Balance)
            FROM Debt d
            WHERE d.BudgetId = b.Id
        ), 0) AS TotalDebtBalance
    FROM Budget b
    LEFT JOIN Income i ON i.BudgetId = b.Id
    WHERE b.Id = @BudgetId
    LIMIT 1;
    ";

    private const string CategoriesSql = @"
    SELECT
        c.Name AS CategoryName,
        SUM(e.AmountMonthly) AS TotalMonthlyAmount
    FROM ExpenseItem e
    JOIN ExpenseCategory c ON e.CategoryId = c.Id
    WHERE e.BudgetId = @BudgetId
    GROUP BY c.Name
    ORDER BY c.Name;
    ";

    private const string DebtsSql = @"
    SELECT
        Id,
        Name,
        Type,
        Balance,
        Apr,
        MonthlyFee,
        MinPayment,
        TermMonths
    FROM Debt
    WHERE BudgetId = @BudgetId
    ORDER BY Balance DESC;
    ";

    private const string SavingsSql = @"
    SELECT
        s.MonthlySavings,
        g.Id,
        g.Name,
        g.TargetAmount,
        g.TargetDate,
        g.AmountSaved
    FROM Savings s
    LEFT JOIN SavingsGoal g ON g.SavingsId = s.Id
    WHERE s.BudgetId = @BudgetId;
    ";
    private const string RecurringExpensesSql = @"
    SELECT
        e.Id,
        e.Name,
        c.Name        AS CategoryName,
        e.AmountMonthly
    FROM ExpenseItem e
    JOIN ExpenseCategory c ON c.Id = e.CategoryId
    WHERE e.BudgetId = @BudgetId
    AND e.AmountMonthly > 0
    AND e.CategoryId <> @SubscriptionCategoryId
    ORDER BY e.AmountMonthly DESC
    LIMIT 5;
    ";
    private const string SubscriptionsSql = @"
    SELECT
        e.Id,
        e.Name,
        e.AmountMonthly
    FROM ExpenseItem e
    WHERE e.BudgetId = @BudgetId
    AND e.AmountMonthly > 0
    AND e.CategoryId = @SubscriptionCategoryId
    ORDER BY e.AmountMonthly DESC, e.Name ASC;
    ";
    private const string SubscriptionsTotalSql = @"
    SELECT COALESCE(SUM(e.AmountMonthly), 0)
    FROM ExpenseItem e
    WHERE e.BudgetId = @BudgetId
    AND e.AmountMonthly > 0
    AND e.CategoryId = @SubscriptionCategoryId;
    ";

}