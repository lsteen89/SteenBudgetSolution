using Backend.Domain.Shared;
using MediatR;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItem;

public sealed record PatchBudgetMonthExpenseItemCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthExpenseItemId,
    string? Name,
    Guid? CategoryId,
    decimal? AmountMonthly,
    bool? IsActive,
    string? SubscriptionLifecycleStatus,
    bool UpdateDefault,
    string? Scope = null)
    : IRequest<Result<BudgetMonthExpenseItemEditorRowDto?>>, ITransactionalCommand;
