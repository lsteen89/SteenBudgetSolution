namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 3 response. Designed for PR 5 / PR 9 to refresh the editor and
// future progress display without a follow-up GET.
//
// Each side reports its own old/new/delta independently because the month
// and plan balances can legitimately diverge — a previous
// `currentMonthOnly` correction may have moved the month row below the
// plan, and a later `currentMonthAndBudgetPlan` adjustment may reconcile
// only one of them. The two `*Updated` flags make a no-op side
// (e.g. requested value already matched persisted value) explicit instead
// of forcing the FE to compare the delta against zero and guess.
//
// `MonthlyPayment` is echoed back unchanged so the FE can assert the
// planned-payment value did not silently move — PR 9 needs that assertion
// to prove the "saldo påverkas inte" promise in the inverse direction.
public sealed record AdjustBudgetMonthDebtBalanceResponseDto(
    Guid MonthDebtId,
    Guid? SourceDebtId,
    string Scope,
    bool MonthBalanceUpdated,
    decimal? OldMonthBalance,
    decimal? NewMonthBalance,
    decimal? MonthDelta,
    bool SourceBalanceUpdated,
    decimal? OldSourceBalance,
    decimal? NewSourceBalance,
    decimal? SourceDelta,
    decimal MonthlyPayment,
    DateTime ChangedAt);
