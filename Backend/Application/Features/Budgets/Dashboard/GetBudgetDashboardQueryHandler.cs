using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Domain.Shared;
using Backend.Application.Features.Budgets.Dashboard;

namespace Backend.Application.Features.Budgets.Dashboard;

public sealed class GetBudgetDashboardQueryHandler
    : IQueryHandler<GetBudgetDashboardQuery, Result<BudgetDashboardDto?>>
{
    private readonly IBudgetDashboardQueryService _svc;

    public GetBudgetDashboardQueryHandler(IBudgetDashboardQueryService svc) => _svc = svc;

    public async Task<Result<BudgetDashboardDto?>> Handle(GetBudgetDashboardQuery request, CancellationToken ct)
        => Result<BudgetDashboardDto?>.Success(await _svc.GetAsync(request.Persoid, ct));
}
