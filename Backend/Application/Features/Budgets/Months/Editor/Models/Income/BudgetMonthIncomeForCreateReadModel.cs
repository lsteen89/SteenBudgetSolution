namespace Backend.Application.Features.Budgets.Months.Editor.Models.Income;

// Slim read model returned from `GetBudgetMonthIncomeForCreateAsync`.
//
// The create handler needs two things when scope writes to the budget plan:
//   1. `BudgetMonthIncomeId` — the parent month container the new month row
//      will be inserted into (same value the existing
//      `GetBudgetMonthIncomeIdAsync` returns).
//   2. `SourceIncomeId` — the budget's plan-side `Income.Id`. It owns the
//      `IncomeSideHustle` / `IncomeHouseholdMember` plan rows that the new
//      baseline row will be parented to.
//
// `SourceIncomeId` is nullable because the materializer creates a
// `BudgetMonthIncome` row even when the budget has no `Income` plan row at
// all (a salary-not-yet-configured edge case). Plan-writing scopes must
// reject that case rather than silently fabricating a plan link.
public sealed record BudgetMonthIncomeForCreateReadModel(
    Guid BudgetMonthIncomeId,
    Guid? SourceIncomeId);
