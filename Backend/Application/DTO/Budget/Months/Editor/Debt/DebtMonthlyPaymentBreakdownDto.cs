namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt Polish PR 1: backend-owned split of a planned monthly payment into
// interest, fee, and principal — plus the projected post-month balance.
//
// This DTO is explanatory. It does NOT replace any stored value:
//   * `Balance` is mutated only via balance-adjustment commands / paid-off
//     flows; the projected balance here is a forward look, not a write.
//   * `MonthlyPayment` is the cash outflow the dashboard equation still uses
//     (`income + carryOver - expenses - savings - includedDebtPayments`).
//   * Progress/history remains strictly derived from real
//     `DebtBalanceEvent` rows; this DTO is unrelated to that surface.
//
// Formula (decimal throughout, rounded to 2dp AwayFromZero on emit):
//   monthlyInterest = currentBalance * apr / 100 / 12
//   monthlyFee      = configured fee, null treated as 0
//   principalPayment           = max(plannedMonthlyPayment - monthlyInterest - monthlyFee, 0)
//   projectedBalanceAfterMonth = max(currentBalance - principalPayment, 0)
//   coversInterestAndFees      = plannedMonthlyPayment >= monthlyInterest + monthlyFee
//   interestAndFeeShortfall    = max(monthlyInterest + monthlyFee - plannedMonthlyPayment, 0)
//
// `plannedMonthlyPayment` here is the payment *actually applied* this
// month, which the editor read model computes from each row's group: it
// equals the stored `MonthlyPayment` for `Active` rows and 0 for
// `Skipped` / `Paid` / `Archived` rows. The caller is responsible for
// passing the right value — this calculator never re-derives it from a
// group or participation flag.
//
// `CoversInterestAndFees == false` is the advisory amber state the FE
// surfaces: "Betalningen täcker inte ränta och avgift…". It is never
// blocking and never causes any backend write.
public sealed record DebtMonthlyPaymentBreakdownDto(
    decimal PlannedMonthlyPayment,
    decimal MonthlyInterest,
    decimal MonthlyFee,
    decimal PrincipalPayment,
    decimal ProjectedBalanceAfterMonth,
    bool CoversInterestAndFees,
    decimal InterestAndFeeShortfall);
