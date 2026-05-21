namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class SavingsOverviewDto
{
    public decimal MonthlySavings { get; init; }              // total saved monthly
    public decimal TotalGoalSavingsMonthly { get; init; }     // allocation detail
    public decimal TotalSavingsMonthly { get; init; }         // same total as MonthlySavings
    public IReadOnlyList<DashboardSavingsGoalDto> Goals { get; init; }
        = Array.Empty<DashboardSavingsGoalDto>();
}
