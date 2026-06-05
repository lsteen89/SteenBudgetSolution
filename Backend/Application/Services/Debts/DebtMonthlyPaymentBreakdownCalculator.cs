using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.DTO.Budget.Months.Editor.Debt;

namespace Backend.Application.Services.Debts;

// Debt Polish PR 1: see `IDebtMonthlyPaymentBreakdownCalculator` for the
// contract. The implementation is deliberately a pure function — no IO,
// no state — so the editor read-model can call it per row without worrying
// about ordering or side effects.
public sealed class DebtMonthlyPaymentBreakdownCalculator : IDebtMonthlyPaymentBreakdownCalculator
{
    public DebtMonthlyPaymentBreakdownDto Calculate(
        decimal currentBalance,
        decimal annualInterestPercent,
        decimal? monthlyFee,
        decimal plannedMonthlyPayment)
    {
        // Clamp inputs that should never go negative in the breakdown view.
        // Defensive: storage validation already enforces >= 0, but a
        // calculator that silently returns negative interest on a corrupt
        // row would be worse than one that pins to 0.
        var balance = currentBalance < 0m ? 0m : currentBalance;
        var apr = annualInterestPercent < 0m ? 0m : annualInterestPercent;
        var fee = monthlyFee.GetValueOrDefault(0m);
        if (fee < 0m) fee = 0m;
        var payment = plannedMonthlyPayment < 0m ? 0m : plannedMonthlyPayment;

        var rawInterest = balance * apr / 100m / 12m;
        var interest = Round2(rawInterest);
        var feeRounded = Round2(fee);
        var paymentRounded = Round2(payment);

        var principal = paymentRounded - interest - feeRounded;
        if (principal < 0m) principal = 0m;
        principal = Round2(principal);

        var projected = balance - principal;
        if (projected < 0m) projected = 0m;
        projected = Round2(projected);

        var requirement = Round2(interest + feeRounded);
        var covers = paymentRounded >= requirement;
        var shortfall = covers ? 0m : Round2(requirement - paymentRounded);

        return new DebtMonthlyPaymentBreakdownDto(
            PlannedMonthlyPayment: paymentRounded,
            MonthlyInterest: interest,
            MonthlyFee: feeRounded,
            PrincipalPayment: principal,
            ProjectedBalanceAfterMonth: projected,
            CoversInterestAndFees: covers,
            InterestAndFeeShortfall: shortfall);
    }

    private static decimal Round2(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
