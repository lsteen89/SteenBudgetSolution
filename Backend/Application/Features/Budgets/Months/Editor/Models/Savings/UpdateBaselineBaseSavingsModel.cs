namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

// Parameters for `UPDATE Savings SET MonthlySavings = ...`. Used only when the
// requested scope writes the plan (`currentMonthAndBudgetPlan` / `budgetPlanOnly`).
// The `SavingsId` is the `SourceSavingsId` read from the month row — orphan
// months (`SourceSavingsId IS NULL`) are rejected before this model is built.
public sealed record UpdateBaselineBaseSavingsModel(
    Guid SavingsId,
    decimal MonthlySavings,
    Guid ActorPersoid,
    DateTime UtcNow);
