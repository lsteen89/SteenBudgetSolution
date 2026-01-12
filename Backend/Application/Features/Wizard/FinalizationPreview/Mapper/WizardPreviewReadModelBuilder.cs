using Backend.Application.Features.Budgets.Dashboard;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Entities.Budget.Income;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.FinalizationPreview.Models;

namespace Backend.Application.Features.Wizard.FinalizationPreview.Mapper;

public sealed class WizardPreviewReadModelBuilder : IWizardPreviewReadModelBuilder
{
    public BudgetDashboardReadModel Build(PreviewBudgetTarget target)
    {
        // ----------------------------
        // INCOME
        // ----------------------------
        var income = target.Income;

        var sideHustles = (income?.SideHustles ?? Array.Empty<SideHustle>())
            .Select(x => new DashboardIncomeItemRm(
                Id: x.Id != Guid.Empty ? x.Id : Guid.NewGuid(),
                Name: x.Name ?? string.Empty,
                AmountMonthly: x.IncomeMonthly
            ))
            .ToList();

        var householdMembers = (income?.HouseholdMembers ?? Array.Empty<HouseholdMember>())
            .Select(x => new DashboardIncomeItemRm(
                Id: x.Id != Guid.Empty ? x.Id : Guid.NewGuid(),
                Name: x.Name ?? string.Empty,
                AmountMonthly: x.IncomeMonthly
            ))
            .ToList();

        var netSalaryMonthly = income?.NetSalaryMonthly ?? 0m;
        var sideHustleMonthly = sideHustles.Sum(x => x.AmountMonthly);
        var householdMembersMonthly = householdMembers.Sum(x => x.AmountMonthly);

        // ----------------------------
        // EXPENSES + SUBSCRIPTIONS
        // ----------------------------
        var recurring = BuildRecurringExpenses(target.Expense);
        var subs = BuildSubscriptions(target.Expense);

        var categories = recurring
            .GroupBy(x => x.CategoryName)
            .Select(g => new DashboardCategoryRm(g.Key, g.Sum(x => x.AmountMonthly)))
            .ToList();

        if (subs.TotalMonthlyAmount > 0m)
        {
            var subName = CategoryName(ExpenseCategories.Subscription);
            categories.Add(new DashboardCategoryRm(subName, subs.TotalMonthlyAmount));
        }

        categories = categories
            .OrderBy(x => x.CategoryName)
            .ToList();

        var totalExpensesMonthly = recurring.Sum(x => x.AmountMonthly) + subs.TotalMonthlyAmount;

        // ----------------------------
        // SAVINGS
        // ----------------------------
        var savingsRm = BuildSavings(target.Savings);
        var monthlySavings = savingsRm?.MonthlySavings ?? 0m;

        // ----------------------------
        // DEBTS
        // ----------------------------
        var debtsRm = (target.Debts ?? Array.Empty<Debt>())
            .Select(d => new DashboardDebtRm(
                Id: d.Id != Guid.Empty ? d.Id : Guid.NewGuid(),
                Name: d.Name ?? string.Empty,
                Type: d.Type ?? string.Empty,
                Balance: d.Balance,
                Apr: d.Apr,
                MonthlyFee: d.MonthlyFee,
                MinPayment: d.MinPayment,
                TermMonths: d.TermMonths
            ))
            .ToList();

        var totalDebtBalance = debtsRm.Sum(x => x.Balance);

        // ----------------------------
        // TOTALS
        // ----------------------------
        var totals = new DashboardTotalsRm(
            IncomeId: income?.Id,
            NetSalaryMonthly: netSalaryMonthly,
            SideHustleMonthly: sideHustleMonthly,
            HouseholdMembersMonthly: householdMembersMonthly,
            TotalExpensesMonthly: totalExpensesMonthly,
            TotalSavingsMonthly: monthlySavings,
            TotalDebtBalance: totalDebtBalance
        );

        return new BudgetDashboardReadModel(
            BudgetId: Guid.Empty,
            Totals: totals,
            Categories: categories,
            RecurringExpenses: recurring,
            Debts: debtsRm,
            Savings: savingsRm,
            Subscriptions: subs,
            SideHustles: sideHustles,
            HouseholdMembers: householdMembers
        );
    }

    private static IReadOnlyList<DashboardRecurringExpenseRm> BuildRecurringExpenses(Expense? exp)
    {
        if (exp?.Items is null || exp.Items.Count == 0)
            return Array.Empty<DashboardRecurringExpenseRm>();

        return exp.Items
            .Where(i => i.AmountMonthly > 0m)
            .Where(i => i.CategoryId != ExpenseCategories.Subscription)
            .Select(i => new DashboardRecurringExpenseRm(
                Id: i.Id != Guid.Empty ? i.Id : Guid.NewGuid(),
                Name: i.Name ?? string.Empty,
                CategoryName: CategoryName(i.CategoryId),
                AmountMonthly: i.AmountMonthly
            ))
            .ToList();
    }

    private static DashboardSubscriptionsRm BuildSubscriptions(Expense? exp)
    {
        if (exp?.Items is null || exp.Items.Count == 0)
            return new DashboardSubscriptionsRm(0m, 0, Array.Empty<DashboardSubscriptionRm>());

        var items = exp.Items
            .Where(i => i.AmountMonthly > 0m)
            .Where(i => i.CategoryId == ExpenseCategories.Subscription)
            .Select(i => new DashboardSubscriptionRm(
                Id: i.Id != Guid.Empty ? i.Id : Guid.NewGuid(),
                Name: i.Name ?? string.Empty,
                AmountMonthly: i.AmountMonthly
            ))
            .ToList();

        return new DashboardSubscriptionsRm(
            TotalMonthlyAmount: items.Sum(x => x.AmountMonthly),
            Count: items.Count,
            Items: items
        );
    }

    private static DashboardSavingsRm? BuildSavings(Backend.Domain.Entities.Budget.Savings.Savings? savings)
    {
        if (savings is null) return null;

        var goals = (savings.SavingsGoals ?? Array.Empty<Backend.Domain.Entities.Budget.Savings.SavingsGoal>())
            .Select(g => new DashboardSavingsGoalRm(
                Id: g.Id != Guid.Empty ? g.Id : Guid.NewGuid(),
                Name: g.Name,
                TargetAmount: g.TargetAmount,
                TargetDate: g.TargetDate,
                AmountSaved: g.AmountSaved
            ))
            .ToList();

        return new DashboardSavingsRm(
            MonthlySavings: savings.MonthlySavings,
            Goals: goals
        );
    }

    private static string CategoryName(Guid categoryId) =>
        ExpenseCategories.NameById.TryGetValue(categoryId, out var name)
            ? name
            : categoryId.ToString();


}
