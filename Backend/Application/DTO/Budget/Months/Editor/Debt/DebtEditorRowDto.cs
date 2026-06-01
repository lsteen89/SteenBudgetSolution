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
    DebtRowActionsDto Actions,
    IReadOnlyList<string> DisabledReasons);
