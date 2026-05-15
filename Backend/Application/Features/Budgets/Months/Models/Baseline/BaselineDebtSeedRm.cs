namespace Backend.Application.Features.Budgets.Months.Models.Baseline;

public sealed record BaselineDebtSeedRm(
    Guid Id,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    DateTime OpenedAt,
    string Status,
    DateTime? ClosedAt,
    string? ClosedReason
);