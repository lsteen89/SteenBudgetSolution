namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 5: SELECT shape for the target editor read. Carries the month-row
// values plus the joined `Debt` source-row values so the read model can
// emit both halves (e.g. `MonthlyPayment` and `SourceMonthlyPayment`) without
// a second query. Month-only rows leave every `Source*` field null.
//
// The legacy `BudgetMonthDebtEditorRowReadModel` is kept for the existing
// narrow `GET /debt-items` endpoint; this richer aggregate is used only by
// the PR 5 `GET /debt-editor` endpoint so the legacy callers are not forced
// to deserialize extra columns they do not use.
public sealed class BudgetMonthDebtEditorAggregateReadModel
{
    // --- Month row identity & metadata ---
    public Guid Id { get; init; }
    public Guid? SourceDebtId { get; init; }
    public string? Name { get; init; }
    public string Type { get; init; } = string.Empty;
    public int SortOrder { get; init; }

    // --- Month-side financial fields ---
    public decimal Balance { get; init; }
    public decimal Apr { get; init; }
    public decimal? MonthlyFee { get; init; }
    public decimal? MinPayment { get; init; }
    public int? TermMonths { get; init; }
    public decimal MonthlyPayment { get; init; }

    // --- Month-side lifecycle/participation columns ---
    public string Status { get; init; } = string.Empty;
    public bool IsDeleted { get; init; }
    public string ParticipationStatus { get; init; } = string.Empty;

    // --- Source-side (Debt) projection — all null for month-only rows ---
    public decimal? SourceBalance { get; init; }
    public decimal? SourceApr { get; init; }
    public decimal? SourceMonthlyFee { get; init; }
    public decimal? SourceMinPayment { get; init; }
    public int? SourceTermMonths { get; init; }
    public decimal? SourceMonthlyPayment { get; init; }
    public string? SourceLifecycleStatus { get; init; }
}
