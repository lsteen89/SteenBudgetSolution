namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Update payload for the Debt PR 2 "edit details" command on a `BudgetMonthDebt`
// month row. Distinct from `UpdateBudgetMonthDebtModel`, which is the narrow
// planned-payment-only update used by the existing patch endpoint.
//
// Balance is intentionally absent: balance is a liability snapshot owned by
// PR 3's dedicated `Uppdatera saldo` command. Detail edits must never move
// the liability number; the SQL only touches the metadata columns below.
//
// `IsOverride` is set to 1 in the SQL because any manual write to the month
// row diverges it from the materialized baseline — even when the caller used
// `currentMonthAndBudgetPlan` and the two sides happen to match, the row was
// touched by the user and should be reported as such.
public sealed record UpdateBudgetMonthDebtDetailsModel(
    Guid Id,
    Guid BudgetMonthId,
    string Name,
    string Type,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    Guid ActorPersoid,
    DateTime UtcNow);
