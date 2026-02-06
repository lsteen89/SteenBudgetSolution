namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class ExpenseCategorySummaryDto
{
    public string CategoryKey { get; init; } = default!;
    public string CategoryName { get; init; } = default!;
    public decimal TotalMonthlyAmount { get; init; }
    public IReadOnlyList<ExpenseLineItemDto> Items { get; init; } = Array.Empty<ExpenseLineItemDto>();
}

public sealed class ExpenseLineItemDto
{
    public string Name { get; init; } = default!;
    public decimal AmountMonthly { get; init; }
}
