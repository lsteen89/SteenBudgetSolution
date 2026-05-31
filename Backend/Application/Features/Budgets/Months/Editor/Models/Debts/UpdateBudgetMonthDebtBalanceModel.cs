namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 3: month-side balance UPDATE input. Separate from
// `UpdateBudgetMonthDebtModel` (planned payment) and
// `UpdateBudgetMonthDebtDetailsModel` (metadata) so the SQL touches exactly
// one column and the audit pipeline cannot blur planned-payment and
// liability-balance changes.
public sealed record UpdateBudgetMonthDebtBalanceModel(
    Guid Id,
    Guid BudgetMonthId,
    decimal Balance,
    Guid ActorPersoid,
    DateTime UtcNow);
