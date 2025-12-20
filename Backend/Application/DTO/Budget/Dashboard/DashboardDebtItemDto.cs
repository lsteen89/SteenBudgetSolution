namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class DashboardDebtItemDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public decimal Balance { get; init; }
    public decimal Apr { get; init; }
    public decimal MonthlyPayment { get; init; }
}