namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed class BudgetMonthSavingsGoalMutationReadModel
{
    public Guid Id { get; init; }
    public Guid BudgetMonthId { get; init; }
    public Guid BudgetMonthSavingsId { get; init; }
    public Guid? SourceSavingsGoalId { get; init; }
    public string? Name { get; init; }
    public decimal? TargetAmount { get; init; }
    public DateTime? TargetDate { get; init; }
    public decimal? AmountSaved { get; init; }
    public decimal MonthlyContribution { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool IsDeleted { get; init; }
}
