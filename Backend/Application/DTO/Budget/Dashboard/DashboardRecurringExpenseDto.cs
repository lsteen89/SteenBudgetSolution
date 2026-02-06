namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class DashboardRecurringExpenseDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public string CategoryKey { get; init; } = default!;
    public string CategoryName { get; init; } = default!;
    public decimal AmountMonthly { get; init; }
}
