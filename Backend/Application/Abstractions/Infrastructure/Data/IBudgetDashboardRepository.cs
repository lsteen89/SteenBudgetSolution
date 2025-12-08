using Backend.Application.DTO.Budget.Dashboard;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetDashboardRepository
{
    Task<BudgetDashboardDto?> GetDashboardAsync(Guid persoid, CancellationToken ct);
}
