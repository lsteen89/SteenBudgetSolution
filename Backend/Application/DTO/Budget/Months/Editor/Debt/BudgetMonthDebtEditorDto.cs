namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 5: the target Debt editor read model. One endpoint
// (`GET /api/budgets/months/{yearMonth}/debt-editor`) returns everything the
// editor UI in PR 6–9 needs to render without re-deriving financial state on
// the client:
//
//   * `Summary` — totals split by group, so the hero / payment-balance strip
//     can display planned-payment and liability-balance figures separately.
//     `IncludedMonthlyPaymentTotal` reconciles with the dashboard's debt
//     payment term (`BudgetMonthDashboardRepository.DebtsSql`) for the same
//     month — both apply the same `ParticipationStatus = 'included'` filter.
//
//   * `Rows` — one richer row per visible `BudgetMonthDebt`, each carrying
//     month-side and source-side field pairs (so the FE can render
//     `Planerad · 1 200 kr` vs. `Plan 1 000 kr` deltas), a precomputed
//     `Group` (active / skipped / paid / archived), per-action `Actions`
//     booleans matching the backend command guards, `DisabledReasons` for
//     the FE to map to copy, and optional balance `Progress` when typed
//     `DebtBalanceEvent` history exists.
//
//   * `RecentEvents` — the latest debt-scoped `BudgetMonthChangeEvent`
//     entries for this month so the FE can render a small audit timeline
//     without parsing arbitrary JSON.
//
// `IsReadOnly` is derived purely from `MonthStatus` — closed and skipped
// months expose no mutation affordances regardless of row state. The legacy
// `GET /debt-items` endpoint is retained for compatibility; the lifecycle /
// participation / balance endpoints from PR 2-4 are unchanged.
public sealed record BudgetMonthDebtEditorDto(
    string YearMonth,
    string MonthStatus,
    bool IsReadOnly,
    DebtEditorSummaryDto Summary,
    IReadOnlyList<DebtEditorRowDto> Rows,
    IReadOnlyList<DebtEditorHistoryEventDto> RecentEvents);
