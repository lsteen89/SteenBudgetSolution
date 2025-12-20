namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class DebtOverviewDto
{
    public decimal TotalDebtBalance { get; init; }
    public decimal TotalMonthlyPayments { get; init; }
    public IReadOnlyList<DashboardDebtItemDto> Debts { get; init; } =
        Array.Empty<DashboardDebtItemDto>();
}