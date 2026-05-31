namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Insert payload for a baseline (budget-plan) Debt row. Used by the Debt PR 2
// create handler when scope is `currentMonthAndBudgetPlan` or `budgetPlanOnly`.
//
// The handler resolves `BudgetId` from `BudgetMonthDebtForCreateReadModel`
// rather than asking the caller to know it. Source lifecycle is intentionally
// forced to `active` at the SQL layer (column default) — new plan rows always
// start active and only move to `paidOff` / `archived` / `deleted` via the
// explicit lifecycle commands shipped in PR 4.
public sealed record InsertBaselineDebtModel(
    Guid Id,
    Guid BudgetId,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    Guid ActorPersoid,
    DateTime UtcNow);
