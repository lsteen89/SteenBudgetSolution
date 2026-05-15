using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtsBulk;

public sealed record PatchBudgetMonthDebtsBulkCommand(
    Guid Persoid,
    string YearMonth,
    IReadOnlyList<PatchBudgetMonthDebtsBulkCommand.Row> Items)
    : IRequest<Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>>, ITransactionalCommand
{
    public sealed record Row(
        Guid MonthDebtId,
        decimal MonthlyPayment,
        string? Scope = null);
}
