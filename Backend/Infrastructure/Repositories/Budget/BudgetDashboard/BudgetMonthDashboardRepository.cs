using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Constants;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Application.Mappings.Budget;

namespace Backend.Infrastructure.Repositories.Budget.BudgetDashboard;

public sealed partial class BudgetMonthDashboardRepository : SqlBase, IBudgetMonthDashboardRepository
{
    private readonly ITimeProvider _clock;

    public BudgetMonthDashboardRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthDashboardRepository> logger,
        IOptions<DatabaseSettings> db,
        ITimeProvider clock)
        : base(unitOfWork, logger, db)
    {
        _clock = clock;
    }

    public async Task<BudgetDashboardReadModel?> GetDashboardDataForMonthAsync(
        Guid budgetMonthId,
        CancellationToken ct)
    {
        var now = _clock.UtcNow;

        var monthMeta = await QuerySingleOrDefaultAsync<DashboardMonthMetaRow>(
            MonthMetaSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

        if (monthMeta is null)
            return null;

        var totalsRow = await QuerySingleOrDefaultAsync<DashboardTotalsRow>(
            TotalsSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

        if (totalsRow is null)
            return null;

        var categories = await QueryAsync<DashboardCategoryRm>(
            CategoriesSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

        var recurring = await QueryAsync<DashboardRecurringExpenseRm>(
            RecurringExpensesSql,
            new
            {
                BudgetMonthId = budgetMonthId,
                SubscriptionCategoryId = ExpenseCategoryIds.Subscription
            },
            ct);

        var debts = (await QueryAsync<DashboardDebtRm>(
            DebtsSql,
            new { BudgetMonthId = budgetMonthId },
            ct)).ToList();

        var savingsRows = await QueryAsync<DashboardSavingsRow>(
            SavingsSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

        DashboardSavingsRm? savings = null;
        if (savingsRows.Count > 0)
        {
            var monthly = savingsRows[0].MonthlySavings;

            var goals = savingsRows
                .Where(r => r.Id.HasValue)
                .Select(r => new DashboardSavingsGoalRm(
                    r.Id!.Value,
                    r.Name,
                    r.TargetAmount,
                    r.TargetDate,
                    r.AmountSaved,
                    r.MonthlyContribution
                ))
                .ToList();

            savings = new DashboardSavingsRm(monthly, goals);
        }

        var subItems = (await QueryAsync<DashboardSubscriptionRm>(
            SubscriptionsSql,
            new
            {
                BudgetMonthId = budgetMonthId,
                SubscriptionCategoryId = ExpenseCategoryIds.Subscription
            },
            ct)).ToList();

        var subTotal = await ExecuteScalarAsync<decimal>(
            SubscriptionsTotalSql,
            new
            {
                BudgetMonthId = budgetMonthId,
                SubscriptionCategoryId = ExpenseCategoryIds.Subscription
            },
            ct);

        var subs = new DashboardSubscriptionsRm(
            TotalMonthlyAmount: subTotal,
            Count: subItems.Count,
            Items: subItems
        );

        var totals = new DashboardTotalsRm(
            totalsRow.IncomeId,
            totalsRow.NetSalaryMonthly,
            totalsRow.SideHustleMonthly,
            totalsRow.HouseholdMembersMonthly,
            totalsRow.TotalExpensesMonthly,
            totalsRow.TotalSavingsMonthly,
            totalsRow.TotalDebtBalance
        );

        var sideRows = await QueryAsync<DashboardIncomeItemRow>(
            SideHustlesSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

        var memberRows = await QueryAsync<DashboardIncomeItemRow>(
            HouseholdMembersSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

        var sideHustles = sideRows
            .Select(x => new DashboardIncomeItemRm(x.Id, x.Name, x.AmountMonthly))
            .ToArray();

        var householdMembers = memberRows
            .Select(x => new DashboardIncomeItemRm(x.Id, x.Name, x.AmountMonthly))
            .ToArray();

        var repaymentStrategy = await ExecuteScalarAsync<string?>(
            RepaymentStrategySql,
            new { BudgetId = monthMeta.BudgetId },
            ct);

        var debtOverview = new DashboardDebtOverviewRm(
            TotalDebtBalance: totals.TotalDebtBalance,
            TotalMonthlyPayments: debts.Sum(d => d.MinPayment ?? 0m),
            RepaymentStrategy: RepaymentStrategyParsing.Parse(repaymentStrategy),
            Debts: debts
        );

        return new BudgetDashboardReadModel(
            BudgetMonthId: monthMeta.BudgetMonthId,
            BudgetId: monthMeta.BudgetId,
            Totals: totals,
            Categories: categories,
            RecurringExpenses: recurring,
            Debt: debtOverview,
            Savings: savings,
            Subscriptions: subs,
            SideHustles: sideHustles,
            HouseholdMembers: householdMembers
        );
    }
}