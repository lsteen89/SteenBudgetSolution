namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 3 (`POST .../debt-items/{monthDebtId}/balance-adjustments`).
//
// `NewBalance` is the absolute new liability snapshot, never a delta. The
// editor's "Uppdatera saldo" drawer is framed as a calm correction, so the
// user types the value their lender currently shows, not a +/− amount.
//
// `Scope` mirrors the metadata-edit / planned-payment scopes
// (`currentMonthOnly` / `currentMonthAndBudgetPlan` / `budgetPlanOnly`) so
// the FE can reuse the same scope-card component across all debt write
// flows. Defaults to `currentMonthOnly` server-side when omitted.
//
// `Note` is the optional free-text "rättelse" reason that lands in the
// structured `DebtBalanceEvent` row. Capped at 500 chars by the validator so
// the JSON-free history table stays cheap to read.
public sealed record AdjustBudgetMonthDebtBalanceRequestDto(
    decimal NewBalance,
    string? Scope = null,
    string? Note = null);
