using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.GetIncomeItems;

public sealed record GetBudgetMonthIncomeItemsQuery(
    Guid Persoid,
    string YearMonth)
    : IRequest<Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>>, ITransactionalCommand;

