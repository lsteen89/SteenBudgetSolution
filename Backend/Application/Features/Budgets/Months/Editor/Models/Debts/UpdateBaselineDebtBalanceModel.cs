namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 3: baseline-plan-side balance UPDATE input. Mirrors
// `UpdateBaselineDebtModel` (planned payment) so the two scoped writes
// share the same parameter shape but live on disjoint columns.
public sealed record UpdateBaselineDebtBalanceModel(
    Guid DebtId,
    decimal Balance,
    Guid ActorPersoid,
    DateTime UtcNow);
