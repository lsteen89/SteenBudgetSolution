using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Application.Constants;
using Microsoft.Extensions.Options;
using Backend.Settings;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Application.Features.Budgets.Dashboard;

namespace Backend.Infrastructure.Repositories.Budget.BudgetDashboard;

public sealed partial class BudgetDashboardRepository : SqlBase, IBudgetDashboardRepository
{
    public BudgetDashboardRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetDashboardRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }
    public async Task<BudgetDashboardReadModel?> GetDashboardDataAsync(Guid persoid, CancellationToken ct)
    {
        var budgetId = await ExecuteScalarAsync<Guid?>(
            BudgetIdSql, new { Persoid = persoid.ToString() }, ct);

        if (budgetId is null) return null;

        var totalsRow = await QuerySingleOrDefaultAsync<TotalsRow>(
            TotalsSql, new { BudgetId = budgetId.Value }, ct);

        if (totalsRow is null) return null;

        var categories = await QueryAsync<ExpenseCategorySummaryDto>(
            CategoriesSql, new { BudgetId = budgetId.Value }, ct);

        var recurringRows = await QueryAsync<RecurringExpenseRow>(
            RecurringExpensesSql,
            new { BudgetId = budgetId.Value, SubscriptionCategoryId = ExpenseCategoryIds.Subscription },
            ct);

        var recurring = recurringRows
            .Select(r => new DashboardRecurringExpenseDto
            {
                Id = r.Id,
                Name = r.Name,
                CategoryName = r.CategoryName,
                AmountMonthly = r.AmountMonthly
            })
            .ToList();

        var debts = await QueryAsync<Debt>(
            DebtsSql, new { BudgetId = budgetId.Value }, ct);

        var savingsRows = await QueryAsync<SavingsRow>(
            SavingsSql, new { BudgetId = budgetId.Value }, ct);

        SavingsOverviewDto? savings = null;
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

            savings = new SavingsOverviewDto { MonthlySavings = monthly, Goals = goals };
        }

        var subItems = (await QueryAsync<DashboardSubscriptionDto>(
            SubscriptionsSql,
            new { BudgetId = budgetId.Value, SubscriptionCategoryId = ExpenseCategoryIds.Subscription },
            ct)).ToList();

        var subTotal = await ExecuteScalarAsync<decimal>(
            SubscriptionsTotalSql,
            new { BudgetId = budgetId.Value, SubscriptionCategoryId = ExpenseCategoryIds.Subscription },
            ct);

        var subs = new SubscriptionsOverviewDto
        {
            TotalMonthlyAmount = subTotal,
            Count = subItems.Count,
            Items = subItems
        };

        var totals = new BudgetDashboardTotals(
            totalsRow.NetSalaryMonthly,
            totalsRow.SideHustleMonthly,
            totalsRow.HouseholdMembersMonthly,
            totalsRow.TotalExpensesMonthly,
            totalsRow.TotalSavingsMonthly,
            totalsRow.TotalDebtBalance);

        var sideHustles = new List<BudgetDashboardIncomeItem>();
        var householdMembers = new List<BudgetDashboardIncomeItem>();

        if (totalsRow.IncomeId.HasValue)
        {
            var sideRows = (await QueryAsync<IncomeItemRow>(
                SideHustlesSql, new { IncomeId = totalsRow.IncomeId.Value }, ct)).ToList();

            var memberRows = (await QueryAsync<IncomeItemRow>(
                HouseholdMembersSql, new { IncomeId = totalsRow.IncomeId.Value }, ct)).ToList();

            sideHustles = sideRows
                .Select(x => new BudgetDashboardIncomeItem(x.Id, x.Name, x.AmountMonthly))
                .ToList();

            householdMembers = memberRows
                .Select(x => new BudgetDashboardIncomeItem(x.Id, x.Name, x.AmountMonthly))
                .ToList();
        }

        return new BudgetDashboardReadModel(
            budgetId.Value,
            totals,
            categories,
            recurring,
            debts,
            savings,
            subs,
            sideHustles,
            householdMembers);
    }
}
