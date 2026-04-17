using Backend.Application.Features.Budgets.Months.Editor.Models.Expense;
using Backend.Application.Features.Budgets.Months.Editor.Models;
namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthEditorRepository
{
    Task<BudgetMonthEditorMetaReadModel?> GetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct);

    Task<IReadOnlyList<BudgetMonthExpenseItemEditorRowReadModel>> GetExpenseItemEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct);
}