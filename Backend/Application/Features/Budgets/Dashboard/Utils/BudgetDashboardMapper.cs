using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Dashboard;

namespace Backend.Application.Features.Budgets.Dashboard.Utils;

internal static class BudgetDashboardMapper
{
    internal static BudgetDashboardDto MapToDto(BudgetDashboardReadModel data, IDebtPaymentCalculator calc, decimal carryOverAmount)
    {
        var debtItems = data.Debts
            .Select(d => new DashboardDebtItemDto
            {
                Id = d.Id,
                Name = d.Name,
                Type = d.Type,
                Balance = d.Balance,
                Apr = d.Apr,
                MonthlyPayment = calc.CalculateMonthlyPayment(
                    new DebtForCalc(d.Type, d.Balance, d.Apr, d.MinPayment, d.MonthlyFee, d.TermMonths))
            })
            .ToList();

        var savingsDto = data.Savings is null
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

        var subsDto = new SubscriptionsOverviewDto
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

        var incomeTotal =
                data.Totals.NetSalaryMonthly +
                data.Totals.SideHustleMonthly +
                data.Totals.HouseholdMembersMonthly;

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
                ByCategory = data.Categories.Select(c => new ExpenseCategorySummaryDto
                {
                    CategoryName = c.CategoryName,
                    TotalMonthlyAmount = c.TotalMonthlyAmount
                }).ToList()
            },
            Savings = savingsDto,
            Debt = new DebtOverviewDto
            {
                TotalDebtBalance = data.Totals.TotalDebtBalance,
                TotalMonthlyPayments = debtItems.Sum(x => x.MonthlyPayment),
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
    internal static BudgetDashboardDto MapToDto(BudgetDashboardReadModel data, IDebtPaymentCalculator calc)
        => MapToDto(data, calc, carryOverAmount: 0m);
}
