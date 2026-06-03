using Backend.Application.Services.Debts;
using FluentAssertions;
using Xunit;

namespace Backend.UnitTests.Services.Debts;

// Debt Polish PR 1: pins the backend-owned monthly breakdown formula so
// neither the editor read model nor a future frontend mirror can drift
// from the PO examples in `Work/Dashboard/Debt/Polish/01-pr-debt-payment-truth.md`.
public sealed class DebtMonthlyPaymentBreakdownCalculatorTests
{
    private readonly DebtMonthlyPaymentBreakdownCalculator _sut = new();

    [Fact]
    public void PO_Example_LowerRate_MatchesHandoff()
    {
        var result = _sut.Calculate(
            currentBalance: 93_000m,
            annualInterestPercent: 10.99m,
            monthlyFee: 130m,
            plannedMonthlyPayment: 1_550m);

        result.MonthlyInterest.Should().Be(851.73m);
        result.MonthlyFee.Should().Be(130m);
        result.PrincipalPayment.Should().Be(568.27m);
        result.ProjectedBalanceAfterMonth.Should().Be(92_431.73m);
        result.CoversInterestAndFees.Should().BeTrue();
        result.InterestAndFeeShortfall.Should().Be(0m);
        result.PlannedMonthlyPayment.Should().Be(1_550m);
    }

    [Fact]
    public void PO_Example_HigherRate_MatchesHandoff()
    {
        var result = _sut.Calculate(
            currentBalance: 93_000m,
            annualInterestPercent: 12.99m,
            monthlyFee: 149.99m,
            plannedMonthlyPayment: 1_550m);

        result.MonthlyInterest.Should().Be(1_006.73m);
        result.MonthlyFee.Should().Be(149.99m);
        result.PrincipalPayment.Should().Be(393.28m);
        result.ProjectedBalanceAfterMonth.Should().Be(92_606.72m);
        result.CoversInterestAndFees.Should().BeTrue();
        result.InterestAndFeeShortfall.Should().Be(0m);
    }

    [Fact]
    public void ZeroApr_GivesZeroInterest_AndPrincipalEqualsPaymentMinusFee()
    {
        var result = _sut.Calculate(
            currentBalance: 10_000m,
            annualInterestPercent: 0m,
            monthlyFee: 50m,
            plannedMonthlyPayment: 1_050m);

        result.MonthlyInterest.Should().Be(0m);
        result.PrincipalPayment.Should().Be(1_000m);
        result.ProjectedBalanceAfterMonth.Should().Be(9_000m);
        result.CoversInterestAndFees.Should().BeTrue();
    }

    [Fact]
    public void NullMonthlyFee_IsTreatedAsZero()
    {
        var result = _sut.Calculate(
            currentBalance: 12_000m,
            annualInterestPercent: 6m,
            monthlyFee: null,
            plannedMonthlyPayment: 400m);

        // interest = 12000 * 6 / 100 / 12 = 60
        result.MonthlyInterest.Should().Be(60m);
        result.MonthlyFee.Should().Be(0m);
        result.PrincipalPayment.Should().Be(340m);
        result.ProjectedBalanceAfterMonth.Should().Be(11_660m);
        result.CoversInterestAndFees.Should().BeTrue();
        result.InterestAndFeeShortfall.Should().Be(0m);
    }

    [Fact]
    public void PaymentBelowInterestAndFee_ClampsPrincipalToZero_AndReportsShortfall()
    {
        // interest = 100000 * 24 / 100 / 12 = 2000
        // requirement = 2000 + 200 = 2200
        // payment 1500 → shortfall 700, principal 0
        var result = _sut.Calculate(
            currentBalance: 100_000m,
            annualInterestPercent: 24m,
            monthlyFee: 200m,
            plannedMonthlyPayment: 1_500m);

        result.MonthlyInterest.Should().Be(2_000m);
        result.MonthlyFee.Should().Be(200m);
        result.PrincipalPayment.Should().Be(0m);
        result.ProjectedBalanceAfterMonth.Should().Be(100_000m);
        result.CoversInterestAndFees.Should().BeFalse();
        result.InterestAndFeeShortfall.Should().Be(700m);
    }

    [Fact]
    public void ZeroBalance_YieldsAllZeroBreakdown()
    {
        var result = _sut.Calculate(
            currentBalance: 0m,
            annualInterestPercent: 18m,
            monthlyFee: 50m,
            plannedMonthlyPayment: 0m);

        result.MonthlyInterest.Should().Be(0m);
        result.MonthlyFee.Should().Be(50m);
        // No payment means the entire fee is unfunded shortfall.
        result.PrincipalPayment.Should().Be(0m);
        result.ProjectedBalanceAfterMonth.Should().Be(0m);
        result.CoversInterestAndFees.Should().BeFalse();
        result.InterestAndFeeShortfall.Should().Be(50m);
    }

    [Fact]
    public void ZeroBalance_WithPaymentAtLeastFee_Covers()
    {
        // Edge: a closed/paid debt with leftover fee can still be "covered"
        // if a payment is set. Real flows shouldn't hit this — paid rows
        // have zero APR/fee/payment — but we lock the behavior anyway.
        var result = _sut.Calculate(
            currentBalance: 0m,
            annualInterestPercent: 18m,
            monthlyFee: 50m,
            plannedMonthlyPayment: 50m);

        result.MonthlyInterest.Should().Be(0m);
        result.PrincipalPayment.Should().Be(0m);
        result.ProjectedBalanceAfterMonth.Should().Be(0m);
        result.CoversInterestAndFees.Should().BeTrue();
        result.InterestAndFeeShortfall.Should().Be(0m);
    }

    [Fact]
    public void NegativeInputs_AreClampedToZero()
    {
        // Defensive guard. Storage validation should make this unreachable,
        // but a corrupt row must not produce negative interest in the DTO.
        var result = _sut.Calculate(
            currentBalance: -100m,
            annualInterestPercent: -5m,
            monthlyFee: -10m,
            plannedMonthlyPayment: -25m);

        result.MonthlyInterest.Should().Be(0m);
        result.MonthlyFee.Should().Be(0m);
        result.PrincipalPayment.Should().Be(0m);
        result.ProjectedBalanceAfterMonth.Should().Be(0m);
        result.PlannedMonthlyPayment.Should().Be(0m);
        result.CoversInterestAndFees.Should().BeTrue();
    }
}
