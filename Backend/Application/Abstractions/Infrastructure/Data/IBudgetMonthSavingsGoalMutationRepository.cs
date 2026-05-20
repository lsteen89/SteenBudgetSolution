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

    Task<BudgetMonthSavingsGoalLifecycleReadModel?> GetSourceSavingsGoalLifecycleAsync(
        Guid savingsGoalId,
        CancellationToken ct);

    Task UpdateMonthSavingsGoalLifecycleAsync(
        UpdateBudgetMonthSavingsGoalLifecycleModel model,
        CancellationToken ct);

    Task UpdateBaselineSavingsGoalLifecycleAsync(
        UpdateBaselineSavingsGoalLifecycleModel model,
        CancellationToken ct);

    // Candidates for close-month completion: active, undeleted goals on the
    // given month whose projected AmountSaved (current + this month's
    // contribution) reaches their TargetAmount. Goals without a positive
    // TargetAmount are excluded so we never flag an "infinite" target as met.
    Task<IReadOnlyList<BudgetMonthSavingsGoalCompletionCandidateReadModel>>
        GetCompletionCandidatesAsync(Guid budgetMonthId, CancellationToken ct);

    // Closes any still-active month rows pointing at the given source goal,
    // excluding the row we already handled directly. Used when close-month
    // completes a source-linked goal so a pre-existing next open month does
    // not silently keep the goal alive. Idempotent.
    Task<int> CloseLinkedActiveMonthSavingsGoalsForSourceAsync(
        Guid sourceSavingsGoalId,
        Guid excludeMonthGoalId,
        string closedReason,
        DateTime closedAtUtc,
        Guid actorPersoid,
        CancellationToken ct);
}
