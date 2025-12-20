using Backend.Domain.Entities.Budget.Debt;
using Backend.Application.Abstractions.Application.Services.Debts;

namespace Backend.Application.Services.Debts;

public sealed class DebtPaymentCalculator : IDebtPaymentCalculator
{
    public decimal CalculateMonthlyPayment(Debt d)
    {
        var fee = d.MonthlyFee ?? 0m;
        var principal = d.Balance;
        var apr = d.Apr;
        var months = d.TermMonths ?? 0;

        return d.Type switch
        {
            "revolving" => (d.MinPayment ?? 0m) + fee,

            "installment" or "bank_loan" =>
                months > 0 ? Amortize(principal, apr, months) + fee : fee,

            "private" =>
                months > 0 ? Amortize(principal, apr, months) + fee : (d.MinPayment ?? 0m) + fee,

            _ => fee
        };
    }

    private static decimal Amortize(decimal principal, decimal annualRatePercent, int months)
    {
        if (principal <= 0m || months <= 0) return 0m;
        if (annualRatePercent <= 0m)
            return Math.Round(principal / months, 2, MidpointRounding.AwayFromZero);

        var r = (annualRatePercent / 100m) / 12m;
        var denom = 1m - (decimal)Math.Pow((double)(1m + r), -months);
        if (denom == 0m) return 0m;

        return Math.Round(principal * r / denom, 2, MidpointRounding.AwayFromZero);
    }
}
