namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Slim read model returned from `GetBudgetMonthForDebtCreateAsync`.
//
// Debt PR 2: the Debt create handler needs the owning `BudgetId` when scope
// writes a new source `Debt` plan row, because `Debt.BudgetId` is the parent
// foreign key and the API only carries the `BudgetMonthId` context. Mirrors
// `BudgetMonthIncomeForCreateReadModel` in shape — the cheapest extra value
// the handler needs alongside `BudgetMonthId` to insert the plan row.
public sealed record BudgetMonthDebtForCreateReadModel(
    Guid BudgetMonthId,
    Guid BudgetId);
