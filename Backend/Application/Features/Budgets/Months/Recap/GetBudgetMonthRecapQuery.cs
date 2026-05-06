using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months.Recap;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Recap;

public sealed record GetBudgetMonthRecapQuery(Guid Persoid, string YearMonth)
    : IQuery<Result<BudgetMonthRecapDto?>>;
