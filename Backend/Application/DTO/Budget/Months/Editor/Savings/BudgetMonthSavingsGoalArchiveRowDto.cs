namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

// Read-only projection of a closed (completed or cancelled) savings goal as
// surfaced by the "previous goals" archive on the savings editor. The active
// editor list (`BudgetMonthSavingsGoalEditorRowDto`) stays active-only — this
// DTO carries the closed history separately so the UI never has to filter the
// editor contract by status.
//
// `AmountSavedAtClose` is the canonical display value for the archive — it is
// derived server-side, never raw stored progression. Per the close-month
// contract, close-month does NOT advance AmountSaved, so a completed goal's
// raw `AmountSaved` will under-report the amount the user actually reached.
// Rule: completed → AmountSaved + MonthlyContribution; cancelled →
// AmountSaved. The UI must not recompute this.
public sealed record BudgetMonthSavingsGoalArchiveRowDto(
    Guid Id,
    Guid? SourceSavingsGoalId,
    string Name,
    decimal? TargetAmount,
    DateTime? TargetDate,
    decimal? AmountSavedAtClose,
    decimal MonthlyContribution,
    string Status,
    string ClosedReason,
    DateTime? ClosedAt,
    bool IsMonthOnly);
