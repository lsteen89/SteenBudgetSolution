namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class DashboardIncomeItemDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public decimal AmountMonthly { get; init; }
}