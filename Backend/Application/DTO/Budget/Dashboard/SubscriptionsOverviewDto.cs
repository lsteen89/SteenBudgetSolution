namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class SubscriptionsOverviewDto
{
    public decimal TotalMonthlyAmount { get; init; }
    public int Count { get; init; }
    public List<DashboardSubscriptionDto> Items { get; init; } = [];
}