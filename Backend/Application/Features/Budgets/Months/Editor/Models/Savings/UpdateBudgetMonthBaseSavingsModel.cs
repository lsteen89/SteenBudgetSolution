namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

// Parameters for `UPDATE BudgetMonthSavings SET MonthlySavings = ..., IsOverride = 1`.
// Mirrors the goal-contribution applier's per-month write — `IsOverride` is
// always set to 1 on a current-month write, matching the goal pattern.
public sealed record UpdateBudgetMonthBaseSavingsModel(
    Guid Id,
    decimal MonthlySavings,
    Guid ActorPersoid,
    DateTime UtcNow);
