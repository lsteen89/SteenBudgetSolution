namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

public sealed class BudgetMonthDebtMutationReadModel
{
    public Guid Id { get; init; }
    public Guid BudgetMonthId { get; init; }
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
    /// Per-month participation (`included` / `notIncluded` / `removed`). See
    /// <c>BudgetMonthDebtParticipationStatuses</c>. Only `included` rows accept
    /// planned-payment mutations.
    /// </summary>
    public string ParticipationStatus { get; init; } = string.Empty;

    /// <summary>
    /// Source lifecycle (`active` / `paidOff` / `archived` / `deleted`) projected from
    /// the linked <c>Debt</c> row via LEFT JOIN. <c>null</c> when this is a month-only
    /// row (<see cref="SourceDebtId"/> is <c>null</c>).
    /// </summary>
    public string? SourceLifecycleStatus { get; init; }
}
