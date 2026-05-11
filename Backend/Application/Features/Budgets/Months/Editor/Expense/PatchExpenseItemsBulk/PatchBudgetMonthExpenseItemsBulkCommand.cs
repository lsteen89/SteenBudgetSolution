using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItemsBulk;

/// <summary>
/// Transactional bulk patch of budget month expense items.
/// Either every row is applied successfully, or none are (the
/// <see cref="UnitOfWorkPipelineBehavior{TRequest, TResponse}"/> rolls back
/// the surrounding transaction on any business or infrastructure failure).
/// </summary>
public sealed record PatchBudgetMonthExpenseItemsBulkCommand(
    Guid Persoid,
    string YearMonth,
    IReadOnlyList<PatchBudgetMonthExpenseItemsBulkCommand.Row> Items)
    : IRequest<Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>>, ITransactionalCommand
{
    public sealed record Row(
        Guid MonthExpenseItemId,
        string? Name,
        Guid? CategoryId,
        decimal? AmountMonthly,
        bool? IsActive,
        string? SubscriptionLifecycleStatus,
        bool UpdateDefault,
        string? Scope = null);
}
