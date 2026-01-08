using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Abstractions.Messaging;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;

public sealed record GetBudgetDashboardMonthQuery(Guid Persoid, string? YearMonth)
    : IQuery<Result<BudgetDashboardMonthDto?>>;
