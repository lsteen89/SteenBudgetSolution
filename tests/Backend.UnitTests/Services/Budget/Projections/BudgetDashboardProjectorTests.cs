using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Services.Budget.Projections;
using Backend.Domain.Entities.Budget.Debt;
using FluentAssertions;
using Xunit;

namespace Backend.UnitTests.Services.Budget.Projections;

public sealed class BudgetDashboardProjectorTests
{
    [Fact]
    public void Project_AddsGoalContributionsToTotalSavings_AndSubtractsThemFromDisposable()
    {
        var projector = new BudgetDashboardProjector();
        var dto = projector.Project(new BudgetDashboardReadModel(
            BudgetId: Guid.NewGuid(),
            BudgetMonthId: Guid.NewGuid(),
            Totals: new DashboardTotalsRm(
                IncomeId: Guid.NewGuid(),
                NetSalaryMonthly: 32500m,
                IncomePaymentDayType: "dayOfMonth",
                IncomePaymentDay: 25,
                SideHustleMonthly: 0m,
                HouseholdMembersMonthly: 0m,
                TotalExpensesMonthly: 12000m,
                TotalSavingsMonthly: 2500m,
                TotalDebtBalance: 0m),
            Categories: Array.Empty<DashboardCategoryRm>(),
            RecurringExpenses: Array.Empty<DashboardRecurringExpenseRm>(),
            Debt: new DashboardDebtOverviewRm(
                TotalDebtBalance: 0m,
                TotalMonthlyPayments: 300m,
                RepaymentStrategy: RepaymentStrategy.Unknown,
                Debts:
                [
                    new DashboardDebtRm(
                        Id: Guid.NewGuid(),
                        Name: "Credit card",
                        Type: "revolving",
                        Balance: 10000m,
                        Apr: 18m,
                        MonthlyFee: 20m,
                        MinPayment: 300m,
                        TermMonths: null,
                        MonthlyPayment: 300m)
                ]),
            Savings: new DashboardSavingsRm(
                MonthlySavings: 2500m,
                IsMonthOnly: false,
                Goals:
                [
                    new DashboardSavingsGoalRm(
                        Id: Guid.NewGuid(),
                        Name: "Emergency fund",
                        TargetAmount: 50000m,
                        TargetDate: new DateTime(2026, 12, 31),
                        AmountSaved: 10000m,
                        MonthlyContribution: 1500m)
                ]),
            Subscriptions: new DashboardSubscriptionsRm(
                TotalMonthlyAmount: 0m,
                Count: 0,
                Items: Array.Empty<DashboardSubscriptionRm>()),
            SideHustles: Array.Empty<DashboardIncomeItemRm>(),
            HouseholdMembers: Array.Empty<DashboardIncomeItemRm>()));

        dto.Savings.Should().NotBeNull();
        dto.Savings!.MonthlySavings.Should().Be(2500m);
        dto.Savings.TotalGoalSavingsMonthly.Should().Be(1500m);
        dto.Savings.TotalSavingsMonthly.Should().Be(4000m);
        // 32500 income - 12000 expenses - (2500 base + 1500 goal) savings
        dto.DisposableAfterExpensesAndSavingsWithCarryMonthly.Should().Be(16500m);
        // ...minus 300 debt payments
        dto.FinalBalanceWithCarryMonthly.Should().Be(16200m);
    }
}
