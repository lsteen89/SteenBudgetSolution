namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

// Write model for inserting a plan-level savings method row. `CustomLabel`
// must be populated when `MethodCode == SavingsMethodCodes.Custom` and null
// otherwise — the DB CHECK constraint will reject the row if this invariant
// is violated, so callers are expected to honor it.
public sealed record InsertSavingsMethodModel(
    Guid Id,
    Guid SavingsId,
    string MethodCode,
    string? CustomLabel,
    Guid ActorPersoid,
    DateTime UtcNow);
