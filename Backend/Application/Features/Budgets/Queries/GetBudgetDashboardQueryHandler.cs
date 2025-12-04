using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budget.GetBudgetDashboard;

public sealed class GetBudgetDashboardQueryHandler
    : IQueryHandler<GetBudgetDashboardQuery, Result<BudgetDashboardDto?>>
{
    private readonly IBudgetDashboardRepository _budgetDashboardRepository;

    public GetBudgetDashboardQueryHandler(IBudgetDashboardRepository budgetDashboardRepository)
    {
        _budgetDashboardRepository = budgetDashboardRepository;
    }

    public async Task<Result<BudgetDashboardDto?>> Handle(
        GetBudgetDashboardQuery request,
        CancellationToken ct)
    {
        var dashboard = await _budgetDashboardRepository.GetDashboardAsync(request.Persoid, ct);
        return Result<BudgetDashboardDto?>.Success(dashboard);
    }
}
