using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Income;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthIncomeItemMutationRepository
{
    Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct);

    Task<IReadOnlyList<BudgetMonthIncomeItemEditorRowReadModel>> GetIncomeItemEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct);

    Task<BudgetMonthIncomeItemMutationReadModel?> GetIncomeItemForMutationAsync(
        Guid budgetMonthId,
        Guid monthIncomeItemId,
        CancellationToken ct);

    Task<Guid?> GetBudgetMonthIncomeIdAsync(Guid budgetMonthId, CancellationToken ct);

    Task<Guid> InsertMonthIncomeItemAsync(
        InsertBudgetMonthIncomeItemModel model,
        CancellationToken ct);

    Task UpdateMonthIncomeItemAsync(
        UpdateBudgetMonthIncomeItemModel model,
        CancellationToken ct);

    Task<bool> BaselineIncomeItemExistsAsync(
        string kind,
        Guid incomeItemId,
        CancellationToken ct);

    Task UpdateBaselineIncomeItemAsync(
        UpdateBaselineIncomeItemModel model,
        CancellationToken ct);

    Task<bool> SoftDeleteMonthIncomeItemAsync(
        Guid budgetMonthIncomeId,
        Guid monthIncomeItemId,
        string kind,
        Guid actorPersoid,
        DateTime utcNow,
        CancellationToken ct);
}
