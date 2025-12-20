using Backend.Application.DTO.Budget.Dashboard;

namespace Backend.Application.Features.Budgets.Dashboard;

public interface IBudgetDashboardQueryService
{
    Task<BudgetDashboardDto?> GetAsync(Guid persoid, CancellationToken ct);
}