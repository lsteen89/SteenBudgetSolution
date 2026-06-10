using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Features.Budgets.Months.Models.Baseline;
// Aliased to a distinct name: an unqualified `ExpenseCategories` binds to the
// sibling namespace Backend.Application.Features.Budgets.ExpenseCategories, which
// shadows the domain type from this namespace.
using ExpenseCategoryCatalog = Backend.Domain.Entities.Budget.Expenses.ExpenseCategories;

namespace Backend.Application.Features.Budgets.Months.NextPreview;

/// <summary>
/// Maps active budget-plan rows into a <see cref="BudgetDashboardReadModel"/>.
///
/// This mirrors how <c>BudgetMonthMaterializer</c> turns the same plan rows into
/// a month and how <c>WizardPreviewReadModelBuilder</c> shapes a non-persisted
/// preview — so a preview built here reconciles to what next month would
/// actually materialise into. It performs no I/O and mutates nothing.
///
/// Subscriptions are split out by category exactly like the wizard/live paths,
/// and each debt keeps the plan's precomputed <c>MonthlyPayment</c> (the same
/// authoritative column materialisation copies forward).
/// </summary>
public sealed class NextMonthPreviewReadModelBuilder : INextMonthPreviewReadModelBuilder
{
    public BudgetDashboardReadModel Build(Guid budgetId, BudgetPlanSeed seed)
    {
        // ---- Income --------------------------------------------------------
        var sideHustles = seed.SideHustles
            .Select(x => new DashboardIncomeItemRm(x.Id, x.Name, x.IncomeMonthly))
            .ToList();

        var householdMembers = seed.HouseholdMembers
            .Select(x => new DashboardIncomeItemRm(x.Id, x.Name, x.IncomeMonthly))
            .ToList();

        var netSalaryMonthly = seed.Income?.NetSalaryMonthly ?? 0m;
        var sideHustleMonthly = sideHustles.Sum(x => x.AmountMonthly);
        var householdMembersMonthly = householdMembers.Sum(x => x.AmountMonthly);

        // ---- Expenses + subscriptions -------------------------------------
        var recurring = BuildRecurringExpenses(seed.ExpenseItems);
        var subs = BuildSubscriptions(seed.ExpenseItems);

        var categories = recurring
            .GroupBy(x => x.CategoryId)
            .Select(g => new DashboardCategoryRm(
                CategoryId: g.Key,
                CategoryName: CategoryName(g.Key),
                TotalMonthlyAmount: g.Sum(x => x.AmountMonthly)))
            .ToList();

        if (subs.TotalMonthlyAmount > 0m)
        {
            categories.Add(new DashboardCategoryRm(
                CategoryId: ExpenseCategoryCatalog.Subscription,
                CategoryName: CategoryName(ExpenseCategoryCatalog.Subscription),
                TotalMonthlyAmount: subs.TotalMonthlyAmount));
        }

        categories = categories
            .OrderBy(x => x.CategoryName)
            .ToList();

        var totalExpensesMonthly = recurring.Sum(x => x.AmountMonthly) + subs.TotalMonthlyAmount;

        // ---- Savings -------------------------------------------------------
        var savings = BuildSavings(seed.Savings, seed.SavingsGoals);

        // ---- Debts ---------------------------------------------------------
        var debts = seed.Debts
            .Select(d => new DashboardDebtRm(
                Id: d.Id,
                Name: d.Name,
                Type: d.Type,
                Balance: d.Balance,
                Apr: d.Apr,
                MonthlyFee: d.MonthlyFee,
                MinPayment: d.MinPayment,
                TermMonths: d.TermMonths,
                MonthlyPayment: d.MonthlyPayment))
            .ToList();

        var debtOverview = new DashboardDebtOverviewRm(
            TotalDebtBalance: debts.Sum(x => x.Balance),
            TotalMonthlyPayments: debts.Sum(x => x.MonthlyPayment),
            RepaymentStrategy: seed.RepaymentStrategy,
            Debts: debts);

        // ---- Totals --------------------------------------------------------
        var totals = new DashboardTotalsRm(
            IncomeId: seed.Income?.Id,
            NetSalaryMonthly: netSalaryMonthly,
            IncomePaymentDayType: seed.Income?.IncomePaymentDayType ?? "dayOfMonth",
            IncomePaymentDay: seed.Income?.IncomePaymentDay,
            SideHustleMonthly: sideHustleMonthly,
            HouseholdMembersMonthly: householdMembersMonthly,
            TotalExpensesMonthly: totalExpensesMonthly,
            TotalSavingsMonthly: savings?.MonthlySavings ?? 0m,
            TotalDebtBalance: debtOverview.TotalDebtBalance);

        return new BudgetDashboardReadModel(
            BudgetId: budgetId,
            BudgetMonthId: null,
            Totals: totals,
            Categories: categories,
            RecurringExpenses: recurring,
            Debt: debtOverview,
            Savings: savings,
            Subscriptions: subs,
            SideHustles: sideHustles,
            HouseholdMembers: householdMembers);
    }

    private static IReadOnlyList<DashboardRecurringExpenseRm> BuildRecurringExpenses(
        IReadOnlyList<BaselineExpenseItemSeedRm> items) =>
        items
            .Where(i => i.AmountMonthly > 0m)
            .Where(i => i.CategoryId != ExpenseCategoryCatalog.Subscription)
            .Select(i => new DashboardRecurringExpenseRm(
                Id: i.Id,
                Name: i.Name,
                CategoryId: i.CategoryId,
                CategoryName: CategoryName(i.CategoryId),
                AmountMonthly: i.AmountMonthly))
            .ToList();

    private static DashboardSubscriptionsRm BuildSubscriptions(
        IReadOnlyList<BaselineExpenseItemSeedRm> items)
    {
        var subs = items
            .Where(i => i.AmountMonthly > 0m)
            .Where(i => i.CategoryId == ExpenseCategoryCatalog.Subscription)
            .Select(i => new DashboardSubscriptionRm(
                Id: i.Id,
                Name: i.Name,
                AmountMonthly: i.AmountMonthly))
            .ToList();

        return new DashboardSubscriptionsRm(
            TotalMonthlyAmount: subs.Sum(x => x.AmountMonthly),
            Count: subs.Count,
            Items: subs);
    }

    private static DashboardSavingsRm? BuildSavings(
        BaselineSavingsSeedRm? savings,
        IReadOnlyList<BaselineSavingsGoalSeedRm> goals)
    {
        if (savings is null) return null;

        var goalRms = goals
            .Select(g => new DashboardSavingsGoalRm(
                Id: g.Id,
                Name: g.Name,
                TargetAmount: g.TargetAmount,
                TargetDate: g.TargetDate,
                AmountSaved: g.AmountSaved,
                MonthlyContribution: g.MonthlyContribution))
            .ToList();

        // The plan IS the source future months are built from, so these rows are
        // never "month-only" overrides.
        return new DashboardSavingsRm(
            MonthlySavings: savings.MonthlySavings,
            IsMonthOnly: false,
            Goals: goalRms);
    }

    private static string CategoryName(Guid categoryId) =>
        ExpenseCategoryCatalog.NameById.TryGetValue(categoryId, out var name)
            ? name
            : categoryId.ToString();
}
