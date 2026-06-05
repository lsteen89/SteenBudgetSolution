namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 4: lifecycle transition `active → paidOff`.
//
// `SetBalanceToZero` is opt-in. When `true` the handler reuses the PR 3
// balance-update path (one `DebtBalanceEvent` row per side that actually
// moved, scope = `currentMonthAndBudgetPlan`). The product call here is
// deliberate: marking paid off is a status decision, not proof of a real
// bank payment, so a user who marks paid off without confirming the balance
// change keeps the existing liability on record until they update it
// manually. The FE confirmation dialog must spell this out (see PR 8).
public sealed record MarkBudgetMonthDebtPaidOffRequestDto(
    bool SetBalanceToZero,
    string? Note);
