namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed class BudgetMonthSavingsForCreateReadModel
{
    public Guid BudgetMonthSavingsId { get; init; }
    public Guid? SourceSavingsId { get; init; }
}
