namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 4: source-side lifecycle transition (paidOff / archived / restore).
// Carries the new `Status` and the appropriate lifecycle timestamp / reason —
// the repo SQL is one statement that conditionally writes whichever timestamp
// matches the transition, leaving the others untouched so historical
// `ArchivedAt` / `PaidOffAt` values survive a restore.
//
// Balance is intentionally not in this shape. `mark-paid-off` with
// `SetBalanceToZero = true` reuses the PR 3 balance-update path; that keeps
// the audit story honest: a lifecycle change and a balance change are two
// facts in two tables, not one collapsed JSON blob.
public sealed record UpdateBaselineDebtLifecycleModel(
    Guid DebtId,
    string Status,
    DateTime? PaidOffAt,
    DateTime? ArchivedAt,
    DateTime? DeletedAt,
    string? LifecycleReason,
    Guid ActorPersoid,
    DateTime UtcNow);
