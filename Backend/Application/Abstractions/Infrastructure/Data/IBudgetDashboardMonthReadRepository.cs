using Backend.Application.DTO.Budget.Dashboard;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetDashboardMonthReadRepository
{
    Task<BudgetDashboardMonthDto?> GetDashboardMonthAsync(
        Guid budgetId,
        Guid budgetMonthId,
        string yearMonth,
        CancellationToken ct);
}