namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class SavingsOverviewDto
{
    public decimal MonthlySavings { get; init; }              // bassparande only
    public decimal TotalGoalSavingsMonthly { get; init; }     // sum of active goal contributions
    public decimal TotalSavingsMonthly { get; init; }         // MonthlySavings + TotalGoalSavingsMonthly

    // Mirrors `BudgetMonthSavings.SourceSavingsId IS NULL` for the open month so
    // the Bassparande dialog can disable plan-scope cards on first open without
    // waiting for a PATCH response. Always `false` for the baseline (non-month)
    // dashboard read — the baseline IS the plan.
    public bool IsMonthOnly { get; init; }

    public IReadOnlyList<DashboardSavingsGoalDto> Goals { get; init; }
        = Array.Empty<DashboardSavingsGoalDto>();
}
