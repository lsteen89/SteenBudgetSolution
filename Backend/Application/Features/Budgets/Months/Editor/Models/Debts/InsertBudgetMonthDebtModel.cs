namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Insert payload for a `BudgetMonthDebt` row created from the Debt editor
// (Debt PR 2). Distinct from `BudgetMonthDebtSeedInsertModel`, which the
// materializer uses to copy active source debts forward into newly opened
// months.
//
// `SourceDebtId` is nullable: `null` → month-only row, non-null → row linked
// to a baseline `Debt` plan row created in the same transaction. The SQL
// fixes `Status = 'active'`, `ParticipationStatus = 'included'`, and
// `IsOverride = 0` so a freshly created row always starts as a normal,
// participating, non-overridden row regardless of how the caller built it.
public sealed record InsertBudgetMonthDebtModel(
    Guid Id,
    Guid BudgetMonthId,
    Guid? SourceDebtId,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    int SortOrder,
    Guid ActorPersoid,
    DateTime UtcNow);
