using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;

public sealed record CreateBudgetMonthIncomeItemCommand(
    Guid Persoid,
    string YearMonth,
    string Kind,
    string Name,
    decimal AmountMonthly,
    bool IsActive)
    : IRequest<Result<BudgetMonthIncomeItemEditorRowDto?>>, ITransactionalCommand;

