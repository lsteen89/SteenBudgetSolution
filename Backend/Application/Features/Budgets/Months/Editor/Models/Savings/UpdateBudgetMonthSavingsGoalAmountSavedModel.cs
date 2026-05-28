namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

/// <summary>
/// Snapshot-row write for a V2 one-time transfer. The new
/// <see cref="AmountSaved"/> is computed by the handler — not derived
/// inside the SQL — so the statement is deterministic, parameterised,
/// and idempotent under retries of the same value.
/// </summary>
public sealed record UpdateBudgetMonthSavingsGoalAmountSavedModel(
    Guid Id,
    Guid BudgetMonthSavingsId,
    decimal AmountSaved,
    Guid ActorPersoid,
    DateTime UtcNow);
