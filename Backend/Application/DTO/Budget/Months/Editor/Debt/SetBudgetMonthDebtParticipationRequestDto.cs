namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 4: skip / include this month.
// `Participation` accepts only `included` or `notIncluded`. `removed` is
// reachable only through the dedicated remove command — exposing it here
// would let the FE accidentally cleanup-delete a row from the same toggle
// that flips skip / include, which is exactly the conflation the lifecycle
// model is designed to prevent.
public sealed record SetBudgetMonthDebtParticipationRequestDto(
    string Participation,
    string? Note);
