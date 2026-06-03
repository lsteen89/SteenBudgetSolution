using Backend.Application.DTO.Budget.Months.Editor.Debt;

namespace Backend.Application.Abstractions.Application.Services.Debts;

// Debt Polish PR 1: splits an already-chosen planned monthly payment into
// interest / fee / principal and projects the post-month balance.
//
// Not to be confused with `IDebtPaymentCalculator`, which answers "what
// payment should be seeded for this debt?" using debt type, term, and APR.
// This interface answers a different question: "given the payment the user
// has already chosen, where does it go this month?"
public interface IDebtMonthlyPaymentBreakdownCalculator
{
    /// <summary>
    /// Computes the monthly breakdown for one debt row.
    /// </summary>
    /// <param name="currentBalance">The row's current liability balance (`Kvar att betala`).</param>
    /// <param name="annualInterestPercent">APR, expressed as a percent (e.g. 10.99m for 10.99%).</param>
    /// <param name="monthlyFee">Configured monthly fee. Null is treated as 0.</param>
    /// <param name="plannedMonthlyPayment">The user-chosen cash outflow for this debt this month.</param>
    DebtMonthlyPaymentBreakdownDto Calculate(
        decimal currentBalance,
        decimal annualInterestPercent,
        decimal? monthlyFee,
        decimal plannedMonthlyPayment);
}
