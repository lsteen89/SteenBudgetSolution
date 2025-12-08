using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budget.GetBudgetDashboard;

public sealed record GetBudgetDashboardQuery(Guid Persoid)
    : IQuery<Result<BudgetDashboardDto?>>;
