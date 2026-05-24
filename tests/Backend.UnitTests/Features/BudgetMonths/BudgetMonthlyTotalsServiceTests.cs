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
