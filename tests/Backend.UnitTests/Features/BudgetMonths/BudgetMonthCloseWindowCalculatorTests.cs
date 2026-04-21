using Backend.Application.Features.Budgets.Months.Shared.CloseWindow;
using FluentAssertions;

namespace Backend.UnitTests.Features.BudgetMonths;

public sealed class BudgetMonthCloseWindowCalculatorTests
{
    [Fact]
    public void Calculate_ForDayOfMonthBeforeCloseWindow_ReturnsClosedWindow()
    {
        var result = BudgetMonthCloseWindowCalculator.Calculate(
            yearMonth: "2026-04",
            incomePaymentDayType: "dayOfMonth",
            incomePaymentDay: 25,
            nowUtc: new DateTime(2026, 4, 21, 23, 59, 59, DateTimeKind.Utc));

        result.Should().BeEquivalentTo(new
        {
            IsCloseWindowOpen = false,
            CloseWindowOpensAtUtc = new DateTime(2026, 4, 22, 0, 0, 0, DateTimeKind.Utc),
            CloseEligibleAtUtc = new DateTime(2026, 4, 25, 0, 0, 0, DateTimeKind.Utc),
            IsOverdueForClose = false
        });
    }

    [Fact]
    public void Calculate_ForDayOfMonthAtCloseWindowStart_OpensCloseWindow()
    {
        var result = BudgetMonthCloseWindowCalculator.Calculate(
            yearMonth: "2026-04",
            incomePaymentDayType: "dayOfMonth",
            incomePaymentDay: 25,
            nowUtc: new DateTime(2026, 4, 22, 0, 0, 0, DateTimeKind.Utc));

        result.IsCloseWindowOpen.Should().BeTrue();
        result.IsOverdueForClose.Should().BeFalse();
        result.CloseWindowOpensAtUtc.Should().Be(new DateTime(2026, 4, 22, 0, 0, 0, DateTimeKind.Utc));
        result.CloseEligibleAtUtc.Should().Be(new DateTime(2026, 4, 25, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void Calculate_OnDueDate_MarksMonthAsOverdue()
    {
        var result = BudgetMonthCloseWindowCalculator.Calculate(
            yearMonth: "2026-04",
            incomePaymentDayType: "dayOfMonth",
            incomePaymentDay: 25,
            nowUtc: new DateTime(2026, 4, 25, 0, 0, 0, DateTimeKind.Utc));

        result.IsCloseWindowOpen.Should().BeTrue();
        result.IsOverdueForClose.Should().BeTrue();
    }

    [Fact]
    public void Calculate_ForLastDayOfMonth_UsesThreeDayCloseWindow()
    {
        var result = BudgetMonthCloseWindowCalculator.Calculate(
            yearMonth: "2026-02",
            incomePaymentDayType: "lastDayOfMonth",
            incomePaymentDay: null,
            nowUtc: new DateTime(2026, 2, 25, 0, 0, 0, DateTimeKind.Utc));

        result.IsCloseWindowOpen.Should().BeTrue();
        result.IsOverdueForClose.Should().BeFalse();
        result.CloseWindowOpensAtUtc.Should().Be(new DateTime(2026, 2, 25, 0, 0, 0, DateTimeKind.Utc));
        result.CloseEligibleAtUtc.Should().Be(new DateTime(2026, 2, 28, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void Calculate_WithInvalidPaymentTiming_ReturnsUnavailable()
    {
        var result = BudgetMonthCloseWindowCalculator.Calculate(
            yearMonth: "2026-04",
            incomePaymentDayType: "dayOfMonth",
            incomePaymentDay: null,
            nowUtc: new DateTime(2026, 4, 25, 0, 0, 0, DateTimeKind.Utc));

        result.Should().Be(BudgetMonthCloseWindowInfo.Unavailable());
    }
}
