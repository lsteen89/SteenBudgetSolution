namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

// Debt PR 5: per-action permissions for one row, computed against the same
// guards the backend command handlers enforce. Each flag corresponds one-to-one
// to a backend command:
//
//   CanEditPayment        → PatchBudgetMonthDebtCommand (PR 0 / 1.5)
//   CanEditDetails        → PatchBudgetMonthDebtDetailsCommand (PR 2)
//   CanUpdateBalance      → AdjustBudgetMonthDebtBalanceCommand (PR 3)
//   CanSkipThisMonth      → SetParticipation Command, target = notIncluded (PR 4)
//   CanIncludeThisMonth   → SetParticipation Command, target = included    (PR 4)
//   CanMarkPaidOff        → MarkBudgetMonthDebtPaidOffCommand (PR 4)
//   CanArchive            → ArchiveBudgetMonthDebtCommand (PR 4)
//   CanRestore            → RestoreBudgetMonthDebtCommand (PR 4)
//   CanRemove             → RemoveBudgetMonthDebtCommand (PR 4)
//
// `CanUpdatePlan` is a derived signal (no dedicated endpoint) that tells the
// FE whether the row is eligible for `currentMonthAndBudgetPlan` /
// `budgetPlanOnly` scopes *right now*. PR 7's add/edit drawers use it to
// disable the plan-scope cards. It follows the same closed-month and
// row-immutability gating as the other action flags — a closed/skipped
// month always sets this to `false`, even on an active source-linked row,
// so the FE cannot surface a scope card whose underlying write would
// already be rejected by the command guards.
//
// All booleans are independent — a row in a closed month gets every flag set
// to `false`. The FE must never enable an action whose flag is `false`; the
// backend command would still reject it, but the read model is the source of
// truth for affordance visibility.
public sealed record DebtRowActionsDto(
    bool CanEditPayment,
    bool CanEditDetails,
    bool CanUpdateBalance,
    bool CanSkipThisMonth,
    bool CanIncludeThisMonth,
    bool CanMarkPaidOff,
    bool CanArchive,
    bool CanRestore,
    bool CanRemove,
    bool CanUpdatePlan);
