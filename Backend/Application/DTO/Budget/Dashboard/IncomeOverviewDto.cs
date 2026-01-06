namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class IncomeOverviewDto
{
    public decimal NetSalaryMonthly { get; init; }

    public decimal SideHustleMonthly { get; init; }
    public decimal HouseholdMembersMonthly { get; init; }

    public IReadOnlyList<DashboardIncomeItemDto> SideHustles { get; init; }
        = Array.Empty<DashboardIncomeItemDto>();

    public IReadOnlyList<DashboardIncomeItemDto> HouseholdMembers { get; init; }
        = Array.Empty<DashboardIncomeItemDto>();

    public decimal TotalIncomeMonthly =>
        NetSalaryMonthly + SideHustleMonthly + HouseholdMembersMonthly;
}