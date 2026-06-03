namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 5: month-level totals for the editor hero + payment/balance strip.
//
// Money fields are derived from the same visible rows the editor renders, so
// the FE can show them without re-summing. Counts are included so PR 6 can
// label group headers (`5 skulder`) and PR 8 can show how many archived /
// paid-off debts exist in the collapsed groups.
//
// Reconciliation contract:
//   * `IncludedMonthlyPaymentTotal` MUST equal the debt term used by
//     `BudgetMonthDashboardRepository.DebtsSql` for the same month — both
//     apply the same `IsDeleted = 0`, `ParticipationStatus = 'included'`,
//     `source IS NULL OR src.Status = 'active'` filter. The dashboard
//     equation `income + carryOver - expenses - savings - debtPayments =
//     remaining` therefore uses the same number this DTO surfaces.
//
//   * `ActiveLiabilityBalanceTotal` MUST equal the `TotalDebtBalance`
//     projection in `BudgetMonthDashboardRepository.TotalsSql` — both
//     include `notIncluded` rows (still owed) and exclude `removed` rows
//     plus source lifecycle terminations.
//
// `RemainingAfterDebtPayments` is intentionally not on this DTO. The Debt
// editor frontend already reads remaining-money via the dashboard query
// (`useBudgetDashboardMonthQuery`); surfacing it here would require this
// endpoint to duplicate the income / expense / savings reads to compute
// the equation, which violates the smallest-safe-change rule and risks the
// two endpoints disagreeing during a transactional gap. PR 6 keeps reading
// remaining from the dashboard.
//
// Debt Polish PR 1: the breakdown totals (`IncludedMonthlyInterestTotal`,
// `IncludedMonthlyFeeTotal`, `IncludedPrincipalPaymentTotal`,
// `ProjectedActiveLiabilityBalanceAfterMonth`,
// `RowsBelowInterestAndFeesCount`) are derived from each included row's
// `PaymentBreakdown` using the same backend-owned formula. They are
// explanatory and never replace `IncludedMonthlyPaymentTotal` in the
// dashboard equation. `ProjectedActiveLiabilityBalanceAfterMonth` projects
// only the principal reduction from `included` rows — `notIncluded` rows
// stay at their current balance because no payment is applied this month.
public sealed record DebtEditorSummaryDto(
    decimal IncludedMonthlyPaymentTotal,
    decimal NotIncludedMonthlyPaymentTotal,
    decimal ActiveLiabilityBalanceTotal,
    decimal PaidOffBalanceTotal,
    decimal ArchivedBalanceTotal,
    decimal IncludedMonthlyInterestTotal,
    decimal IncludedMonthlyFeeTotal,
    decimal IncludedPrincipalPaymentTotal,
    decimal ProjectedActiveLiabilityBalanceAfterMonth,
    int IncludedCount,
    int NotIncludedCount,
    int PaidOffCount,
    int ArchivedCount,
    int RowsBelowInterestAndFeesCount);
