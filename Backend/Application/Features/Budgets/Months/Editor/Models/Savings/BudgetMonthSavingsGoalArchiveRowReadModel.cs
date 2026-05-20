namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed class BudgetMonthSavingsGoalArchiveRowReadModel
{
    public Guid Id { get; init; }
    public Guid? SourceSavingsGoalId { get; init; }
    public string? Name { get; init; }
    public decimal? TargetAmount { get; init; }
    public DateTime? TargetDate { get; init; }
    // Derived in SQL — see GetSavingsGoalArchiveRows. Never raw.
    public decimal? AmountSavedAtClose { get; init; }
    public decimal MonthlyContribution { get; init; }
    public string Status { get; init; } = string.Empty;
    public string ClosedReason { get; init; } = string.Empty;
    public DateTime? ClosedAt { get; init; }
}
