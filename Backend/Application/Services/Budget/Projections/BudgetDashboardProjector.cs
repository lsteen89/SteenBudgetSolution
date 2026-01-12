using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
namespace Backend.Application.Services.Budget.Projections;

public sealed class BudgetDashboardProjector : IBudgetDashboardProjector
{
    private readonly IDebtPaymentCalculator _calc;

    public BudgetDashboardProjector(IDebtPaymentCalculator calc)
        => _calc = calc;

    public BudgetDashboardDto Project(BudgetDashboardReadModel data, decimal carryOverAmount = 0m)
    {
        var debtItems = BuildDebtItems(data);
        var savingsDto = BuildSavings(data);
        var subsDto = BuildSubscriptions(data);

        var incomeTotal = ComputeIncomeTotal(data);
        var expensesTotal = data.Totals.TotalExpensesMonthly;
        var savingsMonthly = data.Savings?.MonthlySavings ?? 0m;
        var debtPayments = debtItems.Sum(x => x.MonthlyPayment);

        var disposableAfterExpenses = incomeTotal - expensesTotal;
        var disposableAfterExpensesAndSavings = incomeTotal - expensesTotal - savingsMonthly;

        var finalBalanceWithCarry =
            incomeTotal - expensesTotal - savingsMonthly - debtPayments + carryOverAmount;

        return new BudgetDashboardDto
        {
            BudgetId = data.BudgetId,

            Income = BuildIncome(data),
            Expenditure = BuildExpenditure(data),
            Savings = savingsDto,

            Debt = new DebtOverviewDto
            {
                TotalDebtBalance = data.Totals.TotalDebtBalance,
                TotalMonthlyPayments = debtPayments,
                Debts = debtItems
            },

            RecurringExpenses = data.RecurringExpenses.Select(r => new DashboardRecurringExpenseDto
            {
                Id = r.Id,
                Name = r.Name,
                CategoryName = r.CategoryName,
                AmountMonthly = r.AmountMonthly
            }).ToList(),

            Subscriptions = subsDto,

            CarryOverAmountMonthly = carryOverAmount,
            DisposableAfterExpensesWithCarryMonthly = disposableAfterExpenses + carryOverAmount,
            DisposableAfterExpensesAndSavingsWithCarryMonthly = disposableAfterExpensesAndSavings + carryOverAmount,
            FinalBalanceWithCarryMonthly = finalBalanceWithCarry
        };
    }

    private List<DashboardDebtItemDto> BuildDebtItems(BudgetDashboardReadModel data) =>
        data.Debts.Select(d => new DashboardDebtItemDto
        {
            Id = d.Id,
            Name = d.Name,
            Type = d.Type,
            Balance = d.Balance,
            Apr = d.Apr,
            MonthlyPayment = _calc.CalculateMonthlyPayment(
                new DebtForCalc(d.Type, d.Balance, d.Apr, d.MinPayment, d.MonthlyFee, d.TermMonths))
        }).ToList();

    private static SavingsOverviewDto? BuildSavings(BudgetDashboardReadModel data) =>
        data.Savings is null
            ? null
            : new SavingsOverviewDto
            {
                MonthlySavings = data.Savings.MonthlySavings,
                Goals = data.Savings.Goals.Select(g => new DashboardSavingsGoalDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    TargetAmount = g.TargetAmount,
                    TargetDate = g.TargetDate,
                    AmountSaved = g.AmountSaved
                }).ToList()
            };

    private static SubscriptionsOverviewDto BuildSubscriptions(BudgetDashboardReadModel data) =>
        new()
        {
            TotalMonthlyAmount = data.Subscriptions.TotalMonthlyAmount,
            Count = data.Subscriptions.Count,
            Items = data.Subscriptions.Items.Select(s => new DashboardSubscriptionDto
            {
                Id = s.Id,
                Name = s.Name,
                AmountMonthly = s.AmountMonthly
            }).ToList()
        };

    private static IncomeOverviewDto BuildIncome(BudgetDashboardReadModel data) =>
        new()
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
        };

    private static ExpenditureOverviewDto BuildExpenditure(BudgetDashboardReadModel data) =>
        new()
        {
            TotalExpensesMonthly = data.Totals.TotalExpensesMonthly,
            ByCategory = data.Categories.Select(c => new ExpenseCategorySummaryDto
            {
                CategoryName = c.CategoryName,
                TotalMonthlyAmount = c.TotalMonthlyAmount
            }).ToList()
        };

    private static decimal ComputeIncomeTotal(BudgetDashboardReadModel data) =>
        data.Totals.NetSalaryMonthly +
        data.Totals.SideHustleMonthly +
        data.Totals.HouseholdMembersMonthly;
}
