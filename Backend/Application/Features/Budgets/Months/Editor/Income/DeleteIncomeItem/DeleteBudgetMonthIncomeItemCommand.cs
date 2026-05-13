using Backend.Application.Common.Behaviors;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.DeleteIncomeItem;

public sealed record DeleteBudgetMonthIncomeItemCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthIncomeItemId)
    : IRequest<Result>, ITransactionalCommand;

