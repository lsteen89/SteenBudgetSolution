using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Features.Budgets.Dashboard;

namespace Backend.Application.Abstractions.Application.Services.Budget.Projections;

public interface IBudgetDashboardProjector
{
    BudgetDashboardDto Project(BudgetDashboardReadModel data, decimal carryOverAmount = 0m);
}
