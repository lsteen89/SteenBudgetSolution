using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Application.Constants;
using Microsoft.Extensions.Options;
using Backend.Settings;
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Infrastructure.Repositories.Budget.BudgetDashboard;

public sealed partial class BudgetDashboardRepository : SqlBase, IBudgetDashboardRepository
{
    private readonly ITimeProvider _clock;
    public BudgetDashboardRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetDashboardRepository> logger,
        IOptions<DatabaseSettings> db,
        ITimeProvider clock)
        : base(unitOfWork, logger, db)
    {
        _clock = clock;
    }

    public async Task<BudgetDashboardReadModel?> GetDashboardDataAsync(Guid persoid, CancellationToken ct)
    {
        var now = _clock.UtcNow;

        var budgetId = await ExecuteScalarAsync<Guid?>(
            BudgetIdSql, new { Persoid = persoid.ToString() }, ct);

        if (budgetId is null) return null;

        var totalsRow = await QuerySingleOrDefaultAsync<DashboardTotalsRow>(
            TotalsSql, new { BudgetId = budgetId.Value }, ct);

        if (totalsRow is null) return null;

        var categories = await QueryAsync<DashboardCategoryRm>(
            CategoriesSql, new { BudgetId = budgetId.Value }, ct);

        var recurring = await QueryAsync<DashboardRecurringExpenseRm>(
            RecurringExpensesSql,
            new { BudgetId = budgetId.Value, SubscriptionCategoryId = ExpenseCategoryIds.Subscription },
            ct);

        var debts = await QueryAsync<DashboardDebtRm>(
            DebtsSql, new { BudgetId = budgetId.Value }, ct);

        var savingsRows = await QueryAsync<DashboardSavingsRow>(
            SavingsSql, new { BudgetId = budgetId.Value }, ct);

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
            new { BudgetId = budgetId.Value, SubscriptionCategoryId = ExpenseCategoryIds.Subscription },
            ct)).ToList();

        var subTotal = await ExecuteScalarAsync<decimal>(
            SubscriptionsTotalSql,
            new { BudgetId = budgetId.Value, SubscriptionCategoryId = ExpenseCategoryIds.Subscription },
            ct);

        var subs = new DashboardSubscriptionsRm(
            TotalMonthlyAmount: subTotal,
            Count: subItems.Count,
            Items: subItems
        );

        var totals = new DashboardTotalsRm(
            totalsRow.IncomeId,
            totalsRow.NetSalaryMonthly,
            totalsRow.IncomePaymentDayType,
            totalsRow.IncomePaymentDay,
            totalsRow.SideHustleMonthly,
            totalsRow.HouseholdMembersMonthly,
            totalsRow.TotalExpensesMonthly,
            totalsRow.TotalSavingsMonthly,
            totalsRow.TotalDebtBalance
        );

        var sideHustles = Array.Empty<DashboardIncomeItemRm>();
        var householdMembers = Array.Empty<DashboardIncomeItemRm>();

        if (totalsRow.IncomeId.HasValue)
        {
            var sideRows = await QueryAsync<DashboardIncomeItemRow>(
                SideHustlesSql, new { IncomeId = totalsRow.IncomeId.Value }, ct);

            var memberRows = await QueryAsync<DashboardIncomeItemRow>(
                HouseholdMembersSql, new { IncomeId = totalsRow.IncomeId.Value }, ct);

            sideHustles = sideRows.Select(x => new DashboardIncomeItemRm(x.Id, x.Name, x.AmountMonthly)).ToArray();
            householdMembers = memberRows.Select(x => new DashboardIncomeItemRm(x.Id, x.Name, x.AmountMonthly)).ToArray();
        }

        var debtOverview = new DashboardDebtOverviewRm(
            TotalDebtBalance: totals.TotalDebtBalance,
            TotalMonthlyPayments: debts.Sum(d => d.MinPayment ?? 0m),
            RepaymentStrategy: RepaymentStrategy.Unknown,
            Debts: debts
        );

        return new BudgetDashboardReadModel(
            BudgetId: budgetId.Value,
            BudgetMonthId: null,
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
