namespace Backend.Application.Features.Budgets.Months.Editor.Models.Income;

// Insert payload for a baseline (budget-plan) income side-row. Mirrors the
// `InsertBaseline*` shape used by savings goals so the create handler can
// write a plan row before the month row in the same transaction.
//
// `IncomeId` is the budget's `Income.Id` (i.e. the parent plan row that owns
// all side/household entries). The handler resolves it from
// `BudgetMonthIncome.SourceIncomeId` rather than asking the caller to know it.
//
// `Frequency` is intentionally not exposed: the editor surfaces monthly
// amounts only, and the existing materialization/dashboard code already
// reads `IncomeMonthly` directly. Mirroring `Income.AddAsync` (which inserts
// side rows with a fixed `Frequency=0`) keeps behavior consistent.
public sealed record InsertBaselineIncomeItemModel(
    Guid Id,
    Guid IncomeId,
    string Kind,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    Guid ActorPersoid,
    DateTime UtcNow);
