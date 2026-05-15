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
}
