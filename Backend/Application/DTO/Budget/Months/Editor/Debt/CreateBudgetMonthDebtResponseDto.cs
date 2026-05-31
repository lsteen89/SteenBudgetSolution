namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Response shape for `POST /api/budgets/months/{yearMonth}/debt-items`
// (Debt PR 2). One of the two payload halves is always populated; both are
// populated when the create wrote a current-month row and a baseline plan
// row in the same transaction.
//
//   scope                         | MonthRow | Source
//   ------------------------------+----------+--------
//   currentMonthOnly              |   yes    |  no
//   currentMonthAndBudgetPlan     |   yes    |  yes
//   budgetPlanOnly                |   no     |  yes
//
// The frontend should not infer the create scope from these nulls alone —
// the create call already carried the user's chosen scope. The wrapper
// exists so the UI can render either the new month row (for current-month
// scopes) or the source summary (for plan-only scopes) without a separate
// fetch.
public sealed record CreateBudgetMonthDebtResponseDto(
    BudgetMonthDebtEditorRowDto? MonthRow,
    DebtSourceSummaryDto? Source);
