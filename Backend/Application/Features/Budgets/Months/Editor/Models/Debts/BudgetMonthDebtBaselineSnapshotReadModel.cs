namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Read model returned from `GetBaselineDebtSnapshotAsync`. Plan-writing detail
// patches use it to capture the real `Debt` (baseline) before-image for the
// audit JSON, so the audited `sourceValuesBefore` reflects the plan row's
// actual state — not whatever the month row currently shows. Month-row values
// may diverge from baseline whenever a previous mutation used a current-month
// scope (sets `BudgetMonthDebt.IsOverride = 1`).
//
// Modeled as a class with init-properties rather than a positional record so
// Dapper materialization is robust to nullable column types — the sibling
// `BudgetMonthDebtMutationReadModel` follows the same pattern for the same
// reason (Dapper's record-constructor matching requires the C# nullability
// to match the SQL column nullability, which is too brittle here because
// `MonthlyFee` and `MinPayment` are nullable in the DDL but Dapper sees them
// as non-null whenever the seeded rows happen to have values).
public sealed class BudgetMonthDebtBaselineSnapshotReadModel
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public decimal Balance { get; init; }
    public decimal Apr { get; init; }
    public decimal? MonthlyFee { get; init; }
    public decimal? MinPayment { get; init; }
    public int? TermMonths { get; init; }
    public decimal MonthlyPayment { get; init; }
    public string Status { get; init; } = string.Empty;
}
