namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

// Snapshot of the per-month base-savings row used by the patch handler to
// decide whether plan scopes are allowed (`SourceSavingsId IS NULL` ⇒ orphan)
// and whether the requested amount actually changes anything.
public sealed record BudgetMonthBaseSavingsMutationReadModel(
    Guid Id,
    Guid? SourceSavingsId,
    decimal MonthlySavings,
    bool IsOverride);
