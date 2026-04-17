namespace Backend.Application.Features.Budgets.Months.Models.Baseline;

public sealed record BaselineExpenseItemSeedRm(
    Guid Id,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    int SortOrder);