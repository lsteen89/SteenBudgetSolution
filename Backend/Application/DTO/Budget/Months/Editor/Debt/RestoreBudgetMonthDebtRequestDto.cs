namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 4: lifecycle transition `archived → active`.
//
// `ReIncludeCurrentMonth` is opt-in. When `true` the handler also flips the
// current open month's row back to `participation = included` so the row
// returns to the dashboard payment total immediately. When `false`, the
// source becomes active again but the current month stays as the user left
// it (typically `notIncluded` from the archive command) — useful when the
// user wants the source restored for future months without retroactively
// reintroducing a payment to a partially-budgeted month.
//
// PR 4 scope: only `archived` sources can be restored. `paidOff` and
// `deleted` have separate undo semantics that are deliberately out of scope.
public sealed record RestoreBudgetMonthDebtRequestDto(
    bool ReIncludeCurrentMonth,
    string? Note);
