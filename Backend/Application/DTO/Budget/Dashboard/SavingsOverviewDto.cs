namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class SavingsOverviewDto
{
    public decimal MonthlySavings { get; init; }              // total saved monthly
    public decimal TotalGoalSavingsMonthly { get; init; }     // allocation detail
    public decimal TotalSavingsMonthly { get; init; }         // same total as MonthlySavings

    // Mirrors `BudgetMonthSavings.SourceSavingsId IS NULL` for the open month so
    // the Bassparande dialog can disable plan-scope cards on first open without
    // waiting for a PATCH response. Always `false` for the baseline (non-month)
    // dashboard read — the baseline IS the plan.
    public bool IsMonthOnly { get; init; }

    public IReadOnlyList<DashboardSavingsGoalDto> Goals { get; init; }
        = Array.Empty<DashboardSavingsGoalDto>();
}
