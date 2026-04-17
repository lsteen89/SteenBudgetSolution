namespace Backend.Application.Features.Budgets.Months.Models.Baseline;

public sealed record BaselineSavingsGoalSeedRm(
    Guid Id,
    string? Name,
    decimal? TargetAmount,
    DateTime? TargetDate,
    decimal? AmountSaved,
    decimal MonthlyContribution,
    DateTime OpenedAt,
    string Status,
    DateTime? ClosedAt,
    string? ClosedReason
);