using System;
using System.Threading;
using System.Threading.Tasks;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Services.Budget;
using FluentAssertions;
using Xunit;

namespace Backend.UnitTests.BudgetMonths;

public sealed class BudgetMonthCloseSnapshotServiceTests
{
    [Fact]
    public async Task ComputeAsync_ComputesFinalBalance_IncludesCarryOver()
    {
        var totals = new FakeTotalsService(new MonthlyTotalsResult(
            BudgetId: Guid.NewGuid(),
            TotalIncome: 1000m,
            TotalExpenses: 200m,
            TotalSavings: 100m,
            TotalDebtPayments: 50m
        ));

        var svc = new BudgetMonthCloseSnapshotService(totals);

        var snap = await svc.ComputeAsync(Guid.NewGuid(), carryOverAmount: 25m, CancellationToken.None);

        snap.Should().NotBeNull();
        snap!.TotalIncome.Should().Be(1000m);
        snap.TotalExpenses.Should().Be(200m);
        snap.TotalSavings.Should().Be(100m);
        snap.TotalDebtPayments.Should().Be(50m);
        snap.FinalBalance.Should().Be(1000m - 200m - 100m - 50m + 25m);
    }

    [Fact]
    public async Task ComputeAsync_WhenTotalsNull_ReturnsNull()
    {
        var totals = new FakeTotalsService(null);
        var svc = new BudgetMonthCloseSnapshotService(totals);

        var snap = await svc.ComputeAsync(Guid.NewGuid(), 0m, CancellationToken.None);

        snap.Should().BeNull();
    }

    private sealed class FakeTotalsService : IBudgetMonthlyTotalsService
    {
        private readonly MonthlyTotalsResult? _result;
        public FakeTotalsService(MonthlyTotalsResult? result) => _result = result;

        public Task<MonthlyTotalsResult?> ComputeAsync(Guid persoid, CancellationToken ct)
            => Task.FromResult(_result);
    }
}
