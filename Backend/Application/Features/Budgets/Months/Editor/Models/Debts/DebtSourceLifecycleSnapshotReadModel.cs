namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 4: minimal projection of `Debt` lifecycle state used by archive /
// restore handlers when they operate by `SourceDebtId` directly (e.g. the
// restore flow, which may target a source whose current-month row is
// `notIncluded` and therefore still resolvable through the existing month
// row, but whose lifecycle still lives on `Debt`). Kept narrow so a single
// SELECT covers the read; full metadata snapshots use
// `BudgetMonthDebtBaselineSnapshotReadModel` instead.
public sealed class DebtSourceLifecycleSnapshotReadModel
{
    public Guid Id { get; init; }
    public Guid BudgetId { get; init; }
    public string Status { get; init; } = string.Empty;
    public decimal Balance { get; init; }
    public DateTime? PaidOffAt { get; init; }
    public DateTime? ArchivedAt { get; init; }
    public DateTime? DeletedAt { get; init; }
    public string? LifecycleReason { get; init; }
}
