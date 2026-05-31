namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Public request shape for `POST /api/budgets/months/{yearMonth}/debt-items`
// (Debt PR 2). `Scope` is one of the three values supported by
// `BudgetMonthDebtEditScopes` — unlike Income, Debt's create exposes all
// three because `budgetPlanOnly` is a real use case: a debt that should
// start in future planning without disturbing the already-materialized
// current month. The handler validates the scope; the validator rejects
// unknown values up front.
//
// `Balance` is required and only meaningful at creation time — it sets the
// starting liability snapshot. Subsequent balance changes go through the
// dedicated `Uppdatera saldo` command (PR 3); detail edits never move it.
public sealed record CreateBudgetMonthDebtRequestDto(
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    string? Scope = null);
