namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

public sealed class BudgetMonthDebtEditorRowReadModel
{
    public Guid Id { get; init; }
    public Guid? SourceDebtId { get; init; }
    public string? Name { get; init; }
    public string Type { get; init; } = string.Empty;
    public decimal Balance { get; init; }
    public decimal Apr { get; init; }
    public decimal? MonthlyFee { get; init; }
    public decimal? MinPayment { get; init; }
    public int? TermMonths { get; init; }
    public decimal MonthlyPayment { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool IsDeleted { get; init; }

    /// <summary>
    /// Per-month participation (`included` / `notIncluded` / `removed`).
    /// </summary>
    public string ParticipationStatus { get; init; } = string.Empty;

    /// <summary>
    /// Source lifecycle (`active` / `paidOff` / `archived` / `deleted`) from
    /// the linked <c>Debt</c> row, or <c>null</c> for month-only rows.
    /// </summary>
    public string? SourceLifecycleStatus { get; init; }
}
