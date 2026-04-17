using Backend.Application.Features.Budgets.Dashboard;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthDashboardRepository
{
    Task<BudgetDashboardReadModel?> GetDashboardDataForMonthAsync(
        Guid budgetMonthId,
        CancellationToken ct);
}