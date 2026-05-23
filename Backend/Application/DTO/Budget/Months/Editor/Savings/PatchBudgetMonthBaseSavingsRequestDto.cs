namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

// Request body for `PATCH api/budgets/months/{yearMonth}/base-savings`.
// `Scope` is one of `BudgetMonthBaseSavingsEditScopes` — null defaults to
// `currentMonthOnly` in the handler so a stale client cannot silently widen
// the write.
public sealed record PatchBudgetMonthBaseSavingsRequestDto(
    decimal AmountMonthly,
    string? Scope);
