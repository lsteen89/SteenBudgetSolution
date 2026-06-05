namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 4: removes a month-only row from the current open month.
//
// Source-linked rows are intentionally rejected (`RemoveBlockedForSourceLinked`)
// because they carry payment history; the right operation there is
// archive, which preserves history and is reversible. The FE turns this
// reason into actionable copy.
public sealed record RemoveBudgetMonthDebtRequestDto(string? Note);
