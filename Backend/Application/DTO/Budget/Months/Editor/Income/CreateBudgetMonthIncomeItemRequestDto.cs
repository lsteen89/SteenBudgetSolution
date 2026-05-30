namespace Backend.Application.DTO.Budget.Months.Editor.Income;

// `Scope` is nullable so existing clients that omit it keep their current
// month-only create behavior. The handler resolves null → `currentMonthOnly`.
//
// Supported create scopes are narrower than edit scopes — only
// `currentMonthOnly` and `currentMonthAndBudgetPlan`. There is no
// `budgetPlanOnly` for create: creating a plan row without touching the
// current month is a future-plan flow that the income editor deliberately
// does not expose.
public sealed record CreateBudgetMonthIncomeItemRequestDto(
    string Kind,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    string? Scope = null);

