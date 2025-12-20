namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class DashboardSubscriptionDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public decimal AmountMonthly { get; init; }
}
