namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class SavingsOverviewDto
{
    public decimal MonthlySavings { get; init; }              // habit
    public decimal TotalGoalSavingsMonthly { get; init; }     // sum of goal contributions
    public decimal TotalSavingsMonthly { get; init; }         // habit + goals
    public IReadOnlyList<DashboardSavingsGoalDto> Goals { get; init; }
        = Array.Empty<DashboardSavingsGoalDto>();
}