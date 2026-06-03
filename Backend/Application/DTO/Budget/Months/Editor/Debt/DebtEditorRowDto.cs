namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 5: one richer row per visible `BudgetMonthDebt`, carrying both
// month-side and source-side field pairs so the FE can render plan vs
// current-month deltas honestly (PR 6's "Ändrad i {månad}" pill, PR 7's
// scope-aware edit preview).
//
// Field-pair convention:
//   * Bare field name (e.g. `Balance`, `MonthlyPayment`) is the month-row
//     value — the figure the user is currently looking at.
//   * `Source*` companion is the corresponding `Debt` plan-row value, or
//     null for month-only rows (where `SourceDebtId is null`).
//
// `Group` is precomputed by `DebtEditorActionResolver.ResolveGroup` so the
// FE never re-derives ledger placement from labels or zero values.
//
// `Progress` is null when no typed `DebtBalanceEvent` history exists for
// this row's source-side OR month-side keys — PR 9 treats null as
// "no history; hide the bar".
//
// `DisabledReasons` is a deduped, stable-ordered list of reason codes from
// `BudgetMonthDebtEditorDisabledReasons`. Each code corresponds to one of
// the disabled action flags, with the highest-level blocker (month-level)
// always listed before row- and source-level codes. PR 8 maps codes to
// localised copy.
//
// Debt Polish PR 1: `PaymentBreakdown` is the backend-owned split of the
// payment that is actually applied this month into interest / fee /
// principal plus a projected post-month balance. It is always present
// (even for paid/archived rows where APR and payment are effectively 0)
// so the FE never has to recompute the formula or guard for null shape.
//
// Important: `PaymentBreakdown.PlannedMonthlyPayment` is the *applied*
// payment, which is `row.MonthlyPayment` only for `Active` rows. For
// `Skipped` rows the stored `MonthlyPayment` is preserved (PR 5's
// "skip never zeroes the planned amount" contract) but no cash leaves the
// budget, so the breakdown shows interest accrual + zero principal + a
// projected balance equal to the current balance. For `Paid` and
// `Archived` rows the row's stored payment is typically 0 anyway.
//
// See `DebtMonthlyPaymentBreakdownDto` for the contract.
public sealed record DebtEditorRowDto(
    Guid Id,
    Guid? SourceDebtId,
    string Name,
    string Type,
    decimal Balance,
    decimal? SourceBalance,
    decimal Apr,
    decimal? SourceApr,
    decimal? MonthlyFee,
    decimal? SourceMonthlyFee,
    decimal? MinPayment,
    decimal? SourceMinPayment,
    int? TermMonths,
    int? SourceTermMonths,
    decimal MonthlyPayment,
    decimal? SourceMonthlyPayment,
    string? SourceLifecycleStatus,
    string ParticipationStatus,
    bool IsMonthOnly,
    bool IsRemoved,
    int SortOrder,
    string Group,
    DebtRowProgressDto? Progress,
    DebtMonthlyPaymentBreakdownDto PaymentBreakdown,
    DebtRowActionsDto Actions,
    IReadOnlyList<string> DisabledReasons);
