namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 5: per-key aggregate over `DebtBalanceEvent` rows used to build
// `DebtRowProgressDto`. One row of this projection covers a single key
// (either a `DebtId` for plan-side events or a `BudgetMonthDebtId` for
// month-side events). The handler runs two SELECTs — one per linkage —
// then attaches whichever aggregate applies to each row.
//
// The DB's CHECK constraint
// (`CK_DebtBalanceEvent_Linkage`) guarantees an event row is keyed to
// exactly one of the two sides, so the two aggregates are disjoint and
// can be merged without double-counting.
public sealed class DebtBalanceEventAggregateReadModel
{
    /// <summary>
    /// `DebtId` for plan-side aggregates, `BudgetMonthDebtId` for month-side.
    /// Caller decides which dictionary to bucket the row into based on the
    /// originating SQL.
    /// </summary>
    public Guid Key { get; init; }

    public int EventCount { get; init; }
    public decimal FirstOldBalance { get; init; }
    public decimal LastNewBalance { get; init; }
    public DateTime FirstEventAt { get; init; }
    public DateTime LastEventAt { get; init; }
}
