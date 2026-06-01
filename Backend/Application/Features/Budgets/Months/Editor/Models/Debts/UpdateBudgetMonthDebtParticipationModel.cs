namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 4: per-month participation toggle (skip / include this month).
// Distinct from `UpdateBudgetMonthDebtModel` (planned payment) and
// `UpdateBudgetMonthDebtBalanceModel` (liability) so the SQL update touches
// only the participation columns — planned payment and balance must stay
// truthful in both directions ("saldo påverkas inte här" / "denna månads
// betalning räknas inte i totalen, men du är fortfarande skyldig saldot").
//
// `IsDeletedMirror` is set to `true` only when participation moves to
// `removed`; the legacy `IsDeleted` flag is kept in sync with the new
// participation column so existing reads (e.g. month close snapshot) that
// still gate on `IsDeleted = 0` continue to behave correctly until they
// migrate to the participation vocabulary.
public sealed record UpdateBudgetMonthDebtParticipationModel(
    Guid Id,
    Guid BudgetMonthId,
    string ParticipationStatus,
    string? ParticipationReason,
    bool IsDeletedMirror,
    Guid ActorPersoid,
    DateTime UtcNow);
