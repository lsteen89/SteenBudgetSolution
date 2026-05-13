namespace Backend.Application.Features.Budgets.Months.Editor.Models.Income;

public sealed class BudgetMonthIncomeItemMutationReadModel
{
    public Guid Id { get; init; }
    public Guid BudgetMonthId { get; init; }
    public Guid BudgetMonthIncomeId { get; init; }
    public Guid? SourceIncomeItemId { get; init; }
    public string Kind { get; init; } = string.Empty;
    public string? Name { get; init; }
    public decimal AmountMonthly { get; init; }
    public bool IsActive { get; init; }
    public bool IsDeleted { get; init; }
}
