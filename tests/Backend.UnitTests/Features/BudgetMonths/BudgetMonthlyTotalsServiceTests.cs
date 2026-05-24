using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Services.Budget.Compute;
using Backend.Domain.Entities.Budget.Debt;
using FluentAssertions;
using Xunit;

namespace Backend.UnitTests.Features.BudgetMonths;

public sealed class BudgetMonthlyTotalsServiceTests
{
    [Fact]
    public async Task ComputeAsync_AddsGoalContributionsToTotalSavings()
    {
        var budgetMonthId = Guid.NewGuid();
        var budgetId = Guid.NewGuid();
        var service = new BudgetMonthlyTotalsService(new FakeBudgetMonthDashboardRepository(
            new BudgetDashboardReadModel(
                BudgetId: budgetId,
                BudgetMonthId: budgetMonthId,
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
                    TotalMonthlyPayments: 0m,
                    RepaymentStrategy: RepaymentStrategy.Unknown,
                    Debts: Array.Empty<DashboardDebtRm>()),
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
                HouseholdMembers: Array.Empty<DashboardIncomeItemRm>())));

        var result = await service.ComputeAsync(budgetMonthId, CancellationToken.None);

        result.Should().NotBeNull();
        // 2500 bassparande + 1500 goal contribution
        result!.TotalSavings.Should().Be(4000m);
    }

    [Fact]
    public async Task ComputeAsync_TotalSavings_IsBaseSavingsPlusActiveGoalContributions()
    {
        // Contract guard for the supersede commit
        // (fix(budget): include goal contributions in savings total, supersedes
        // 84d008c8 + fff019ac). TotalSavings on the close-time snapshot is the
        // total monthly savings outflow — bassparande base PLUS active goal
        // contributions. Goals are independent commitments, not allocation
        // detail of the base.
        //
        // If this test ever flips back to "base only", the close-month snapshot
        // will freeze an inflated FinalBalance into history while the dashboard
        // and savings page show the goals-included number. Read
        // docs/ai/ai-changelog.md (2026-05-24 supersede entry) before changing
        // it.
        //
        // Numbers mirror the devhistory@local.test open-month seed:
        //   53500 income − 67435 expenses − 7000 savings − 2535 debts
        //
        // Given MonthlySavings = 3000 and active goals summing to 4000
        // Then  TotalSavings = 7000
        var budgetMonthId = Guid.NewGuid();
        var budgetId = Guid.NewGuid();
        var service = new BudgetMonthlyTotalsService(new FakeBudgetMonthDashboardRepository(
            new BudgetDashboardReadModel(
                BudgetId: budgetId,
                BudgetMonthId: budgetMonthId,
                Totals: new DashboardTotalsRm(
                    IncomeId: Guid.NewGuid(),
                    NetSalaryMonthly: 53500m,
                    IncomePaymentDayType: "dayOfMonth",
                    IncomePaymentDay: 25,
                    SideHustleMonthly: 0m,
                    HouseholdMembersMonthly: 0m,
                    TotalExpensesMonthly: 67435m,
                    // Deliberately wrong — service must derive TotalSavings from
                    // Savings.MonthlySavings + goals, not from Totals.
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
                HouseholdMembers: Array.Empty<DashboardIncomeItemRm>())));

        var result = await service.ComputeAsync(budgetMonthId, CancellationToken.None);

        result.Should().NotBeNull();
        result!.TotalIncome.Should().Be(53500m);
        result.TotalExpenses.Should().Be(67435m);
        // 3000 bassparande + (2200 + 1200 + 600) goal contributions
        result.TotalSavings.Should().Be(7000m);
        result.TotalDebtPayments.Should().Be(2535m);
    }

    private sealed class FakeBudgetMonthDashboardRepository : IBudgetMonthDashboardRepository
    {
        private readonly BudgetDashboardReadModel _readModel;

        public FakeBudgetMonthDashboardRepository(BudgetDashboardReadModel readModel)
        {
            _readModel = readModel;
        }

        public Task<BudgetDashboardReadModel?> GetDashboardDataForMonthAsync(
            Guid budgetMonthId,
            CancellationToken ct)
            => Task.FromResult<BudgetDashboardReadModel?>(_readModel);
    }
}
