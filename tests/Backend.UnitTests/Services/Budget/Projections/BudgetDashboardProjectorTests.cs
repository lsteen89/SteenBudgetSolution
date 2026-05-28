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

    [Fact]
    public void Projects_TotalSavingsMonthly_AsBaseSavingsPlusActiveGoalContributions()
    {
        // Contract guard for the supersede commit
        // (fix(budget): include goal contributions in savings total, supersedes
        // 84d008c8 + fff019ac). TotalSavingsMonthly is the total monthly
        // savings outflow — bassparande base PLUS active goal contributions.
        // Goals are independent commitments, not allocation detail of the base.
        //
        // If this test ever flips back to "base only", the dashboard's Pengaläge
        // will silently drift from the savings page's six-term Kvar identity
        // again (devhistory@local.test April 2026: +950 kr vs −3 050 kr).
        // Read docs/ai/ai-changelog.md (2026-05-24 supersede entry) before
        // changing it.
        //
        // Numbers mirror the devhistory@local.test open-month seed:
        //   53500 income + 20420 carry − 67435 expenses − 7000 savings − 2535 debts = −3050
        //
        // Given MonthlySavings = 3000 and active goals summing to 4000
        // Then  TotalSavingsMonthly = 7000
        // Then  FinalBalanceWithCarryMonthly = income + carry − expenses − 7000 − debts
        var projector = new BudgetDashboardProjector();
        var dto = projector.Project(
            new BudgetDashboardReadModel(
                BudgetId: Guid.NewGuid(),
                BudgetMonthId: Guid.NewGuid(),
                Totals: new DashboardTotalsRm(
                    IncomeId: Guid.NewGuid(),
                    NetSalaryMonthly: 53500m,
                    IncomePaymentDayType: "dayOfMonth",
                    IncomePaymentDay: 25,
                    SideHustleMonthly: 0m,
                    HouseholdMembersMonthly: 0m,
                    TotalExpensesMonthly: 67435m,
                    // Set deliberately wrong: projector must derive TotalSavingsMonthly
                    // from Savings.MonthlySavings + goals, not from Totals.
                    TotalSavingsMonthly: 0m,
                    TotalDebtBalance: 0m),
                Categories: Array.Empty<DashboardCategoryRm>(),
                RecurringExpenses: Array.Empty<DashboardRecurringExpenseRm>(),
                Debt: new DashboardDebtOverviewRm(
                    TotalDebtBalance: 0m,
                    TotalMonthlyPayments: 2535m,
                    RepaymentStrategy: RepaymentStrategy.Unknown,
                    Debts:
                    [
                        new DashboardDebtRm(
                            Id: Guid.NewGuid(),
                            Name: "Loan",
                            Type: "installment",
                            Balance: 0m,
                            Apr: 5m,
                            MonthlyFee: 0m,
                            MinPayment: 2535m,
                            TermMonths: null,
                            MonthlyPayment: 2535m)
                    ]),
                Savings: new DashboardSavingsRm(
                    MonthlySavings: 3000m,
                    IsMonthOnly: false,
                    Goals:
                    [
                        new DashboardSavingsGoalRm(
                            Id: Guid.NewGuid(),
                            Name: "Emergency Fund",
                            TargetAmount: 120000m,
                            TargetDate: new DateTime(2028, 4, 30),
                            AmountSaved: 52000m,
                            MonthlyContribution: 2200m),
                        new DashboardSavingsGoalRm(
                            Id: Guid.NewGuid(),
                            Name: "Vacation Fund",
                            TargetAmount: 36000m,
                            TargetDate: new DateTime(2027, 2, 28),
                            AmountSaved: 12000m,
                            MonthlyContribution: 1200m),
                        new DashboardSavingsGoalRm(
                            Id: Guid.NewGuid(),
                            Name: "Home Repair",
                            TargetAmount: 50000m,
                            TargetDate: new DateTime(2027, 10, 31),
                            AmountSaved: 18000m,
                            MonthlyContribution: 600m)
                    ]),
                Subscriptions: new DashboardSubscriptionsRm(
                    TotalMonthlyAmount: 0m,
                    Count: 0,
                    Items: Array.Empty<DashboardSubscriptionRm>()),
                SideHustles: Array.Empty<DashboardIncomeItemRm>(),
                HouseholdMembers: Array.Empty<DashboardIncomeItemRm>()),
            carryOverAmount: 20420m);

        dto.Savings.Should().NotBeNull();
        dto.Savings!.MonthlySavings.Should().Be(3000m);
        dto.Savings.TotalGoalSavingsMonthly.Should().Be(4000m);
        dto.Savings.TotalSavingsMonthly.Should().Be(7000m);

        // 53500 income + 20420 carry − 67435 expenses − 7000 savings − 2535 debts
        dto.FinalBalanceWithCarryMonthly.Should().Be(-3050m);
    }
}
