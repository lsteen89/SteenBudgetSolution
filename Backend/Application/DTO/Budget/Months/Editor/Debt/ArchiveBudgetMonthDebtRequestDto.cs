namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 4: lifecycle transition `active → archived`. Note is optional and
// stored in `Debt.LifecycleReason` (capped at 255 chars to match the column).
public sealed record ArchiveBudgetMonthDebtRequestDto(string? Note);
