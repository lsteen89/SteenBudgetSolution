using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Infrastructure.Data.BaseClass;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Persistence.Repositories;

public sealed class BudgetDashboardRepository : SqlBase, IBudgetDashboardRepository
{
    // Internal records for mapping
    private sealed record TotalsRow(
        decimal NetSalaryMonthly,
        decimal SideHustleMonthly,
        decimal TotalExpensesMonthly,
        decimal TotalSavingsMonthly,
        decimal TotalDebtBalance);

    private sealed record SavingsRow(
        decimal MonthlySavings,
        Guid? Id,
        string? Name,
        decimal? TargetAmount,
        DateTime? TargetDate,
        decimal? AmountSaved);
    private sealed record RecurringExpenseRow(
        Guid Id,
        string Name,
        string CategoryName,
        decimal AmountMonthly);

    private const string BudgetIdSql = @"
SELECT Id
FROM Budget
WHERE Persoid = UNHEX(REPLACE(@Persoid, '-', ''))
ORDER BY CreatedAt DESC
LIMIT 1;
";

    private const string TotalsSql = @"
SELECT
    COALESCE(i.NetSalaryMonthly, 0)                      AS NetSalaryMonthly,
    COALESCE((
        SELECT SUM(ish.IncomeMonthly)
        FROM IncomeSideHustle ish
        WHERE ish.IncomeId = i.Id
    ), 0)                                                AS SideHustleMonthly,
    COALESCE((
        SELECT SUM(e.AmountMonthly)
        FROM ExpenseItem e
        WHERE e.BudgetId = b.Id
    ), 0)                                                AS TotalExpensesMonthly,
    COALESCE((
        SELECT s.MonthlySavings
        FROM Savings s
        WHERE s.BudgetId = b.Id
        LIMIT 1
    ), 0)                                                AS TotalSavingsMonthly,
    COALESCE((
        SELECT SUM(d.Balance)
        FROM Debt d
        WHERE d.BudgetId = b.Id
    ), 0)                                                AS TotalDebtBalance
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
    Apr
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
ORDER BY e.AmountMonthly DESC
LIMIT 5;
";

    public BudgetDashboardRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetDashboardRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public async Task<BudgetDashboardDto?> GetDashboardAsync(Guid persoid, CancellationToken ct)
    {
        // 1) Get latest budget for this person
        var budgetId = await ExecuteScalarAsync<Guid?>(
            BudgetIdSql,
            new { Persoid = persoid.ToString() },
            ct);

        if (budgetId is null)
            return null;

        // 2) Aggregate totals
        var totals = await QuerySingleOrDefaultAsync<TotalsRow>(
            TotalsSql,
            new { BudgetId = budgetId.Value },
            ct);

        if (totals is null)
            return null;

        // 3) Expenses by category
        var categories = await QueryAsync<ExpenseCategorySummaryDto>(
            CategoriesSql,
            new { BudgetId = budgetId.Value },
            ct);

        // 3b) Top recurring expenses (fixed + subs + other)
        var recurringRows = await QueryAsync<RecurringExpenseRow>(
            RecurringExpensesSql,
            new { BudgetId = budgetId.Value },
            ct);

        var recurringExpenses = recurringRows
            .Select(r => new DashboardRecurringExpenseDto
            {
                Id = r.Id,
                Name = r.Name,
                CategoryName = r.CategoryName,
                AmountMonthly = r.AmountMonthly
            })
            .ToList();

        // 4) Debts
        var debtItems = await QueryAsync<DashboardDebtItemDto>(
            DebtsSql,
            new { BudgetId = budgetId.Value },
            ct);

        var debtOverview = new DebtOverviewDto
        {
            TotalDebtBalance = totals.TotalDebtBalance,
            Debts = debtItems
        };

        // 5) Savings + goals
        var savingsRows = await QueryAsync<SavingsRow>(
            SavingsSql,
            new { BudgetId = budgetId.Value },
            ct);

        SavingsOverviewDto? savingsOverview = null;
        if (savingsRows.Count > 0)
        {
            var monthly = savingsRows[0].MonthlySavings;

            var goals = savingsRows
                .Where(r => r.Id.HasValue)
                .Select(r => new DashboardSavingsGoalDto
                {
                    Id = r.Id!.Value,
                    Name = r.Name,
                    TargetAmount = r.TargetAmount,
                    TargetDate = r.TargetDate,
                    AmountSaved = r.AmountSaved
                })
                .ToList();

            savingsOverview = new SavingsOverviewDto
            {
                MonthlySavings = monthly,
                Goals = goals
            };
        }

        var incomeOverview = new IncomeOverviewDto
        {
            NetSalaryMonthly = totals.NetSalaryMonthly,
            SideHustleMonthly = totals.SideHustleMonthly
        };

        var expenditureOverview = new ExpenditureOverviewDto
        {
            TotalExpensesMonthly = totals.TotalExpensesMonthly,
            ByCategory = categories
        };

        return new BudgetDashboardDto
        {
            BudgetId = budgetId.Value,
            Income = incomeOverview,
            Expenditure = expenditureOverview,
            Savings = savingsOverview,
            Debt = debtOverview,
            RecurringExpenses = recurringExpenses
        };
    }
}
