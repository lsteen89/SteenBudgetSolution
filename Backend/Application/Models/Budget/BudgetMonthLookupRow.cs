namespace Backend.Application.Models.Budget;

public sealed class BudgetMonthLookupRow
{
    public Guid Id { get; init; }
    public Guid BudgetId { get; init; }
    public string YearMonth { get; init; } = default!;
    public string Status { get; init; } = default!;
}