namespace Backend.Application.Features.Budgets.Months.Models.Insert;

public sealed record BudgetMonthDebtSeedInsertModel(
    Guid Id,
    Guid SourceDebtId,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    DateTime OpenedAt,
    string Status,
    DateTime? ClosedAt,
    string? ClosedReason,
    int SortOrder
);