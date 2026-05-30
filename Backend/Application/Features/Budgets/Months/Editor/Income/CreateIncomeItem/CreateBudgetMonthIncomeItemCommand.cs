using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;

// `Scope` is the create-scope choice from the editor drawer. Null falls back
// to `currentMonthOnly` so older callers (and integration tests written
// before this field existed) keep their previous behavior. Plan-writing
// values must pass `BudgetMonthIncomeEditScopes.IsSupportedCreateScope`;
// see `CreateBudgetMonthIncomeItemCommandValidator`.
public sealed record CreateBudgetMonthIncomeItemCommand(
    Guid Persoid,
    string YearMonth,
    string Kind,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    string? Scope = null)
    : IRequest<Result<BudgetMonthIncomeItemEditorRowDto?>>, ITransactionalCommand;

