namespace Backend.Infrastructure.Repositories.Budget.BudgetDashboard;

public sealed partial class BudgetMonthDashboardRepository
{
    private const string MonthMetaSql = @"
    SELECT
        bm.Id AS BudgetMonthId,
        bm.BudgetId
    FROM BudgetMonth bm
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    private const string SideHustlesSql = @"
    SELECT
        ish.Id,
        ish.Name,
        ish.IncomeMonthly AS AmountMonthly
    FROM BudgetMonthIncome bmi
    JOIN BudgetMonthIncomeSideHustle ish
        ON ish.BudgetMonthIncomeId = bmi.Id
    WHERE bmi.BudgetMonthId = @BudgetMonthId
      AND bmi.IsDeleted = 0
      AND ish.IsDeleted = 0
      AND ish.IsActive = 1
    ORDER BY ish.IncomeMonthly DESC, ish.Name ASC;";

    private const string TotalsSql = @"
    SELECT
        bmi.Id AS IncomeId,
        COALESCE(bmi.NetSalaryMonthly, 0) AS NetSalaryMonthly,
        COALESCE(bmi.IncomePaymentDayType, 'dayOfMonth') AS IncomePaymentDayType,
        CAST(bmi.IncomePaymentDay AS SIGNED) AS IncomePaymentDay,

        COALESCE((
            SELECT SUM(ish.IncomeMonthly)
            FROM BudgetMonthIncomeSideHustle ish
            WHERE ish.BudgetMonthIncomeId = bmi.Id
            AND ish.IsDeleted = 0
            AND ish.IsActive = 1
        ), 0) AS SideHustleMonthly,

        COALESCE((
            SELECT SUM(ihm.IncomeMonthly)
            FROM BudgetMonthIncomeHouseholdMember ihm
            WHERE ihm.BudgetMonthIncomeId = bmi.Id
            AND ihm.IsDeleted = 0
            AND ihm.IsActive = 1
        ), 0) AS HouseholdMembersMonthly,

        COALESCE((
            SELECT SUM(e.AmountMonthly)
            FROM BudgetMonthExpenseItem e
            WHERE e.BudgetMonthId = bm.Id
            AND e.IsDeleted = 0
            AND e.IsActive = 1
            AND (
                e.SubscriptionLifecycleStatus IS NULL
                OR e.SubscriptionLifecycleStatus = @ActiveSubscriptionLifecycleStatus
            )
        ), 0) AS TotalExpensesMonthly,

        COALESCE((
            SELECT s.MonthlySavings
            FROM BudgetMonthSavings s
            WHERE s.BudgetMonthId = bm.Id
            AND s.IsDeleted = 0
            LIMIT 1
        ), 0) AS TotalSavingsMonthly,

        -- Debt PR 1: liability balance includes `notIncluded` rows (the user
        -- still owes the money even when payment is skipped this month) but
        -- excludes `removed` participation and source lifecycle terminations
        -- (paidOff / archived / deleted) — those liabilities are no longer
        -- carried in normal planning. `IsDeleted = 0` is retained for backward
        -- compatibility with rows that pre-date the participation column.
        COALESCE((
            SELECT SUM(d.Balance)
            FROM BudgetMonthDebt d
            LEFT JOIN Debt src ON src.Id = d.SourceDebtId
            WHERE d.BudgetMonthId = bm.Id
            AND d.IsDeleted = 0
            AND d.ParticipationStatus <> 'removed'
            AND (src.Id IS NULL OR src.Status = 'active')
        ), 0) AS TotalDebtBalance

    FROM BudgetMonth bm
    LEFT JOIN BudgetMonthIncome bmi
        ON bmi.BudgetMonthId = bm.Id
    AND bmi.IsDeleted = 0
    WHERE bm.Id = @BudgetMonthId
    LIMIT 1;";

    private const string CategoriesSql = @"
    SELECT
        c.Id AS CategoryId,
        c.Name AS CategoryName,
        SUM(e.AmountMonthly) AS TotalMonthlyAmount
    FROM BudgetMonthExpenseItem e
    JOIN ExpenseCategory c ON e.CategoryId = c.Id
    WHERE e.BudgetMonthId = @BudgetMonthId
    AND e.IsDeleted = 0
    AND e.IsActive = 1
    AND (
        e.SubscriptionLifecycleStatus IS NULL
        OR e.SubscriptionLifecycleStatus = @ActiveSubscriptionLifecycleStatus
    )
    GROUP BY c.Id, c.Name
    ORDER BY c.Name;";

    // `IsMonthOnly` mirrors `BudgetMonthSavings.SourceSavingsId IS NULL` — orphan
    // months reject plan-writing scopes (see PatchBudgetMonthBaseSavingsCommandHandler),
    // so the dashboard exposes the same signal to the editor's bassparande dialog.
    private const string SavingsSql = @"
    SELECT
        s.MonthlySavings,
        (s.SourceSavingsId IS NULL) AS IsMonthOnly,
        g.Id,
        g.Name,
        g.TargetAmount,
        g.TargetDate,
        g.AmountSaved,
        g.MonthlyContribution
    FROM BudgetMonthSavings s
    LEFT JOIN BudgetMonthSavingsGoal g
        ON g.BudgetMonthSavingsId = s.Id
    AND g.IsDeleted = 0
    AND g.Status = 'active'
    WHERE s.BudgetMonthId = @BudgetMonthId
    AND s.IsDeleted = 0
    ORDER BY g.SortOrder, g.CreatedAt, g.Id;";

    // Debt PR 1: this projection feeds `BudgetMonthlyTotalsService`, which sums
    // every returned row's `MonthlyPayment` into the month's debt-payment total.
    // Filtering by `ParticipationStatus = 'included'` is what makes skip /
    // not-included rows drop out of the dashboard equation without zeroing
    // anyone's planned payment value.
    private const string DebtsSql = @"
    SELECT
        d.Id,
        d.Name,
        d.Type,
        d.Balance,
        d.Apr,
        d.MonthlyFee,
        d.MinPayment,
        d.TermMonths,
        d.MonthlyPayment
    FROM BudgetMonthDebt d
    LEFT JOIN Debt src ON src.Id = d.SourceDebtId
    WHERE d.BudgetMonthId = @BudgetMonthId
    AND d.IsDeleted = 0
    AND d.ParticipationStatus = 'included'
    AND (src.Id IS NULL OR src.Status = 'active')
    ORDER BY d.Balance DESC;";

    private const string RecurringExpensesSql = @"
    SELECT
        e.Id,
        e.Name,
        e.CategoryId AS CategoryId,
        c.Name AS CategoryName,
        e.AmountMonthly
    FROM BudgetMonthExpenseItem e
    JOIN ExpenseCategory c ON c.Id = e.CategoryId
    WHERE e.BudgetMonthId = @BudgetMonthId
    AND e.IsDeleted = 0
    AND e.IsActive = 1
    AND (
        e.SubscriptionLifecycleStatus IS NULL
        OR e.SubscriptionLifecycleStatus = @ActiveSubscriptionLifecycleStatus
    )
    AND e.AmountMonthly > 0
    AND e.CategoryId <> @SubscriptionCategoryId
    ORDER BY e.AmountMonthly DESC
    LIMIT 5;";

    private const string SubscriptionsSql = @"
    SELECT
        e.Id,
        e.Name,
        e.AmountMonthly
    FROM BudgetMonthExpenseItem e
    WHERE e.BudgetMonthId = @BudgetMonthId
    AND e.IsDeleted = 0
    AND e.IsActive = 1
    AND (
        e.SubscriptionLifecycleStatus IS NULL
        OR e.SubscriptionLifecycleStatus = @ActiveSubscriptionLifecycleStatus
    )
    AND e.AmountMonthly > 0
    AND e.CategoryId = @SubscriptionCategoryId
    ORDER BY e.AmountMonthly DESC, e.Name ASC;";

    private const string SubscriptionsTotalSql = @"
    SELECT COALESCE(SUM(e.AmountMonthly), 0)
    FROM BudgetMonthExpenseItem e
    WHERE e.BudgetMonthId = @BudgetMonthId
    AND e.IsDeleted = 0
    AND e.IsActive = 1
    AND (
        e.SubscriptionLifecycleStatus IS NULL
        OR e.SubscriptionLifecycleStatus = @ActiveSubscriptionLifecycleStatus
    )
    AND e.AmountMonthly > 0
    AND e.CategoryId = @SubscriptionCategoryId;";

    private const string HouseholdMembersSql = @"
    SELECT
        ihm.Id,
        ihm.Name,
        ihm.IncomeMonthly AS AmountMonthly
    FROM BudgetMonthIncome bmi
    JOIN BudgetMonthIncomeHouseholdMember ihm
        ON ihm.BudgetMonthIncomeId = bmi.Id
    WHERE bmi.BudgetMonthId = @BudgetMonthId
    AND bmi.IsDeleted = 0
    AND ihm.IsDeleted = 0
    AND ihm.IsActive = 1
    ORDER BY ihm.IncomeMonthly DESC, ihm.Name ASC;";

    private const string RepaymentStrategySql = @"
    SELECT DebtRepaymentStrategy
    FROM Budget
    WHERE Id = @BudgetId
    LIMIT 1;";
}
