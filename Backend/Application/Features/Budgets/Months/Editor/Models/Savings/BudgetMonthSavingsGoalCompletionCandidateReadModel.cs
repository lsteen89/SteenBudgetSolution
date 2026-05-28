namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

// Raw monthly-row projection used to detect close-month completion
// candidates. Source-of-truth values come from BudgetMonthSavingsGoal,
// never from the baseline plan row.
public sealed record BudgetMonthSavingsGoalCompletionCandidateReadModel(
    Guid Id,
    Guid? SourceSavingsGoalId,
    string? Name,
    decimal TargetAmount,
    decimal? AmountSaved,
    decimal MonthlyContribution);
