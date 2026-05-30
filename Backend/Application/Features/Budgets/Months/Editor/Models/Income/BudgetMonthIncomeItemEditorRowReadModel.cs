namespace Backend.Application.Features.Budgets.Months.Editor.Models.Income;

public sealed class BudgetMonthIncomeItemEditorRowReadModel
{
    public Guid Id { get; init; }
    public Guid? SourceIncomeItemId { get; init; }
    public string Kind { get; init; } = string.Empty;
    public string? Name { get; init; }
    public decimal AmountMonthly { get; init; }
    public bool IsActive { get; init; }
    public bool IsDeleted { get; init; }

    // Source-plan comparison fields. Null when the row is month-only
    // (no linked plan row) or when the salary plan row has no name column.
    public string? SourceName { get; init; }
    public decimal? SourceAmountMonthly { get; init; }
    public bool? SourceIsActive { get; init; }
}
