using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoalsBulk;

public sealed record PatchBudgetMonthSavingsGoalsBulkCommand(
    Guid Persoid,
    string YearMonth,
    IReadOnlyList<PatchBudgetMonthSavingsGoalsBulkCommand.Row> Items)
    : IRequest<Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>>, ITransactionalCommand
{
    public sealed record Row(
        Guid MonthSavingsGoalId,
        decimal MonthlyContribution,
        string? Scope = null);
}
