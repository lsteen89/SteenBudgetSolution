namespace Backend.Application.Features.Budgets.Months.Models.Insert;

public sealed record BudgetMonthSavingsGoalSeedInsertModel(
    Guid Id,
    Guid SourceSavingsGoalId,
    string? Name,
    decimal? TargetAmount,
    DateTime? TargetDate,
    decimal? AmountSaved,
    decimal MonthlyContribution,
    DateTime OpenedAt,
    string Status,
    DateTime? ClosedAt,
    string? ClosedReason,
    int SortOrder
);