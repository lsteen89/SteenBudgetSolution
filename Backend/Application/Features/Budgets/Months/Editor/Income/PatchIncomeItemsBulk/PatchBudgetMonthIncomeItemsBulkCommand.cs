using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItemsBulk;

public sealed record PatchBudgetMonthIncomeItemsBulkCommand(
    Guid Persoid,
    string YearMonth,
    IReadOnlyList<PatchBudgetMonthIncomeItemsBulkCommand.Row> Items)
    : IRequest<Result<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>>, ITransactionalCommand
{
    public sealed record Row(
        Guid MonthIncomeItemId,
        string? Name,
        decimal? AmountMonthly,
        bool? IsActive,
        bool UpdateDefault,
        string? Scope = null);
}

