using Backend.Domain.Shared;
using MediatR;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.DeleteExpenseItem.DeleteExpenseItem;

public sealed record DeleteBudgetMonthExpenseItemCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthExpenseItemId)
    : IRequest<Result>, ITransactionalCommand;