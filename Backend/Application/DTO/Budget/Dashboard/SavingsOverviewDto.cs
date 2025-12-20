namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class SavingsOverviewDto
{
    public decimal MonthlySavings { get; init; }
    public IReadOnlyList<DashboardSavingsGoalDto> Goals { get; init; } =
        Array.Empty<DashboardSavingsGoalDto>();
}