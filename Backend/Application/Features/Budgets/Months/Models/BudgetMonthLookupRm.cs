namespace Backend.Application.Features.Budgets.Months.Models;

public sealed class BudgetMonthLookupRm
{
    public Guid Id { get; init; }
    public Guid BudgetId { get; init; }
    public string YearMonth { get; init; } = default!;
    public string Status { get; init; } = default!;
}