namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 5: repayment progress for one row, derived strictly from the
// typed `DebtBalanceEvent` history that PR 3 introduced. Never synthesised
// from the current balance alone — the planning brief is explicit that
// progress must reflect real recorded events, not implied math.
//
//   `CurrentBalance`  — the row's current `Balance` (echoed for FE convenience
//                        so the progress bar does not need to cross-reference
//                        the row's own balance field).
//   `FirstBalance`    — the oldest `OldBalance` value across this row's
//                        events (per-side: source-linked rows take the
//                        plan-side aggregate; month-only rows take the
//                        month-side aggregate).
//   `TotalPaidDelta`  — sum of (FirstBalance - CurrentBalance) reduction;
//                        positive when balance went down across the events.
//                        Negative is possible (e.g. interest accrual that the
//                        user posted manually) and intentionally not clamped.
//   `PercentPaid`     — `TotalPaidDelta / FirstBalance` * 100, rounded by the
//                        FE for display. Null when `FirstBalance == 0` so the
//                        FE cannot divide by zero or show "100% paid" on a
//                        debt that never had a balance.
//   `EventCount`      — number of `DebtBalanceEvent` rows that contributed.
//                        Hidden in PR 9's chart unless > 1.
//   `FirstEventAt` /
//   `LastEventAt`     — bounds of the time axis for the PR 9 mini-chart.
//
// `Progress` on the row DTO is null when no `DebtBalanceEvent` rows exist for
// the row's source-side OR month-side keys. PR 9 treats null as "no history;
// hide the bar entirely".
public sealed record DebtRowProgressDto(
    decimal CurrentBalance,
    decimal FirstBalance,
    decimal TotalPaidDelta,
    decimal? PercentPaid,
    int EventCount,
    DateTime FirstEventAt,
    DateTime LastEventAt);
