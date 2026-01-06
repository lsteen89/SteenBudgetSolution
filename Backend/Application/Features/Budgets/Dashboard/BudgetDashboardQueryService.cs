using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Application.Services.Debts;

namespace Backend.Application.Features.Budgets.Dashboard;

public sealed class BudgetDashboardQueryService : IBudgetDashboardQueryService
{
    private readonly IBudgetDashboardRepository _repo;
    private readonly IDebtPaymentCalculator _debtCalc;

    public BudgetDashboardQueryService(IBudgetDashboardRepository repo, IDebtPaymentCalculator debtCalc)
    {
        _repo = repo;
        _debtCalc = debtCalc;
    }

    public async Task<BudgetDashboardDto?> GetAsync(Guid persoid, CancellationToken ct)
    {
        var data = await _repo.GetDashboardDataAsync(persoid, ct);
        if (data is null) return null;

        var debtItems = data.Debts
            .Select(d => new DashboardDebtItemDto
            {
                Id = d.Id,
                Name = d.Name,
                Type = d.Type,
                Balance = d.Balance,
                Apr = d.Apr,
                MonthlyPayment = _debtCalc.CalculateMonthlyPayment(d)
            })
            .ToList();

        var debtOverview = new DebtOverviewDto
        {
            TotalDebtBalance = data.Totals.TotalDebtBalance,
            TotalMonthlyPayments = debtItems.Sum(x => x.MonthlyPayment),
            Debts = debtItems
        };

        return new BudgetDashboardDto
        {
            BudgetId = data.BudgetId,
            Income = new IncomeOverviewDto
            {
                NetSalaryMonthly = data.Totals.NetSalaryMonthly,
                SideHustleMonthly = data.Totals.SideHustleMonthly,
                HouseholdMembersMonthly = data.Totals.HouseholdMembersMonthly,

                SideHustles = data.SideHustles.Select(x => new DashboardIncomeItemDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    AmountMonthly = x.AmountMonthly
                }).ToList(),

                HouseholdMembers = data.HouseholdMembers.Select(x => new DashboardIncomeItemDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    AmountMonthly = x.AmountMonthly
                }).ToList(),
            },
            Expenditure = new ExpenditureOverviewDto
            {
                TotalExpensesMonthly = data.Totals.TotalExpensesMonthly,
                ByCategory = data.Categories
            },
            Savings = data.Savings,
            Debt = debtOverview,
            RecurringExpenses = data.RecurringExpenses,
            Subscriptions = data.Subscriptions
        };
    }
}
