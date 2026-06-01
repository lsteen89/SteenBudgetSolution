namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 4: shared response shape for the five lifecycle / participation
// commands. Designed so PR 5's read model + PR 8's confirmation UI can both
// refresh state without a follow-up GET:
//
//   * The participation pair describes whether the row counts in this
//     month's debt payment total.
//   * The source-lifecycle pair describes whether the underlying debt is
//     still active, paid off, or archived in the plan.
//   * `BalanceUpdated` / `MonthBalanceAfter` / `SourceBalanceAfter` are set
//     only when `mark-paid-off` with `SetBalanceToZero = true` actually
//     moved balance — for every other command they are explicitly false /
//     null so the FE can't confuse a lifecycle change with a real balance
//     change.
//   * `MonthlyPayment` is echoed unchanged from the row so the FE can
//     assert (in PR 9) that lifecycle commands never silently move the
//     planned payment.
public sealed record BudgetMonthDebtLifecycleActionResponseDto(
    Guid MonthDebtId,
    Guid? SourceDebtId,
    string Action,
    string? PreviousParticipationStatus,
    string ParticipationStatus,
    string? PreviousSourceLifecycleStatus,
    string? SourceLifecycleStatus,
    bool BalanceUpdated,
    decimal? OldMonthBalance,
    decimal? NewMonthBalance,
    decimal? OldSourceBalance,
    decimal? NewSourceBalance,
    decimal MonthlyPayment,
    DateTime ChangedAt);
