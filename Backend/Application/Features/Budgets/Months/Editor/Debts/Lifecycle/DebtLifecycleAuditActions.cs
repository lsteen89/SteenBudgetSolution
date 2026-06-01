namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle;

// Debt PR 4: stable audit action vocabulary written into
// `BudgetMonthChangeEvent.ChangeSetJson.action`. Distinct strings from the
// participation values themselves (e.g. `markPaidOff` vs the source-status
// `paidOff`) so audit readers can tell a transition apart from a steady
// state without parsing a separate field.
internal static class DebtLifecycleAuditActions
{
    public const string SetParticipation = "setParticipation";
    public const string MarkPaidOff      = "markPaidOff";
    public const string Archive          = "archive";
    public const string Restore          = "restore";
    public const string Remove           = "remove";
}
