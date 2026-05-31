namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Surfaces the baseline `Debt` plan row after a Debt PR 2 create that wrote
// the plan side — either alongside a current-month row
// (`currentMonthAndBudgetPlan`) or on its own (`budgetPlanOnly`).
//
// The frontend uses this to (a) explain that a `budgetPlanOnly` debt starts
// in future planning rather than the current month, and (b) avoid having to
// re-fetch the row when both sides were created in the same transaction.
public sealed record DebtSourceSummaryDto(
    Guid SourceDebtId,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment);
