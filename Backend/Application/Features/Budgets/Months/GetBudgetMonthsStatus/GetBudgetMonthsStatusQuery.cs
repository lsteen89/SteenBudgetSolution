using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.GetBudgetMonthsStatus;

public sealed record GetBudgetMonthsStatusQuery(Guid Persoid)
    : IQuery<Result<BudgetMonthsStatusDto?>>;
