using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthSavingsGoalMutationRepository
{
    Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct);

    Task<IReadOnlyList<BudgetMonthSavingsGoalEditorRowReadModel>> GetSavingsGoalEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct);

    Task<BudgetMonthSavingsGoalMutationReadModel?> GetSavingsGoalForMutationAsync(
        Guid budgetMonthId,
        Guid monthSavingsGoalId,
        CancellationToken ct);

    Task UpdateMonthSavingsGoalContributionAsync(
        UpdateBudgetMonthSavingsGoalModel model,
        CancellationToken ct);

    Task<bool> BaselineSavingsGoalExistsAsync(
        Guid savingsGoalId,
        CancellationToken ct);

    Task UpdateBaselineSavingsGoalContributionAsync(
        UpdateBaselineSavingsGoalModel model,
        CancellationToken ct);

    Task UpdateMonthSavingsGoalTargetDateAsync(
        UpdateBudgetMonthSavingsGoalTargetDateModel model,
        CancellationToken ct);

    Task UpdateBaselineSavingsGoalTargetDateAsync(
        UpdateBaselineSavingsGoalTargetDateModel model,
        CancellationToken ct);

    Task<int> UpdateOpenLinkedMonthSavingsGoalTargetDateAsync(
        UpdateOpenLinkedMonthSavingsGoalTargetDateModel model,
        CancellationToken ct);

    Task<BudgetMonthSavingsForCreateReadModel?> GetBudgetMonthSavingsForCreateAsync(
        Guid budgetMonthId,
        CancellationToken ct);

    Task InsertBaselineSavingsGoalAsync(
        InsertBaselineSavingsGoalModel model,
        CancellationToken ct);

    Task InsertMonthSavingsGoalAsync(
        InsertBudgetMonthSavingsGoalModel model,
        CancellationToken ct);
}
