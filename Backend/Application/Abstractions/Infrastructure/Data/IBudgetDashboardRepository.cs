using Backend.Application.Features.Budgets.Dashboard;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetDashboardRepository
{
    Task<BudgetDashboardReadModel?> GetDashboardDataAsync(Guid persoid, CancellationToken ct);
}
