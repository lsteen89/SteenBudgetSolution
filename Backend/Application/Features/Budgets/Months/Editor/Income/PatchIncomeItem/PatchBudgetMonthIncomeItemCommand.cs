using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;

public sealed record PatchBudgetMonthIncomeItemCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthIncomeItemId,
    string? Name,
    decimal? AmountMonthly,
    bool? IsActive,
    bool UpdateDefault,
    string? Scope = null)
    : IRequest<Result<BudgetMonthIncomeItemEditorRowDto?>>, ITransactionalCommand;

