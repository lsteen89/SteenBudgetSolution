namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Public request shape for
// `PATCH /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/details`
// (Debt PR 2). Distinct from the planned-payment-only PATCH route, which
// remains as-is for backward compatibility and for the lighter "edit
// planned payment" drawer.
//
// `Balance` is intentionally not part of this contract. The handler will
// not move the liability number; balance adjustments live in PR 3's
// dedicated `Uppdatera saldo` command so the change is auditable and
// visibly separate from a planned-payment edit.
public sealed record PatchBudgetMonthDebtDetailsRequestDto(
    string Name,
    string Type,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    string? Scope = null);
