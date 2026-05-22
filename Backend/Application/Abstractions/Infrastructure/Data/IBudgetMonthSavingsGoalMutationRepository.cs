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

    // Closed savings goals (ClosedReason in 'completed' or 'cancelled', not
    // IsDeleted) for the savings editor "previous goals" archive. Budget-
    // scoped, not month-scoped, so a goal completed in an earlier month
    // keeps appearing under "Tidigare mål" when the user moves into a later
    // open month. `upperBoundUtc` is the exclusive `ClosedAt` upper bound —
    // typically the start of the month after the user's selected yearMonth
    // — so historical views never leak goals closed later. Sorted by
    // ClosedAt DESC so the most recently finished goal comes first.
    Task<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowReadModel>>
        GetSavingsGoalArchiveRowsAsync(Guid budgetId, DateTime upperBoundUtc, CancellationToken ct);

    // Plan-level savings methods (one row per method) for the user's budget.
    // Methods belong to `Savings`, never to individual goals, so the lookup
    // is budget-scoped. Returns `Id` (for future delete), the stable
    // `MethodCode`, and the optional `CustomLabel` (populated only for
    // `custom` rows). Stably ordered server-side.
    Task<IReadOnlyList<SavingsMethodReadModel>> GetSavingsMethodsAsync(
        Guid budgetId,
        CancellationToken ct);

    // Returns the `Savings.Id` for the given budget, or null when the budget
    // has no `Savings` row yet. Methods live on `Savings`, so add/remove
    // handlers need this lookup before they can insert. Read-only; safe to
    // call outside a transaction.
    Task<Guid?> GetSavingsIdForBudgetAsync(
        Guid budgetId,
        CancellationToken ct);

    // Inserts one plan-level savings method row. The DB CHECK / UNIQUE
    // constraints provide the final guarantees on `(SavingsId, code)` and
    // `(SavingsId, lower(label))` uniqueness; callers are expected to
    // pre-check via `GetSavingsMethodsAsync` so the happy path never relies
    // on a constraint violation.
    Task InsertSavingsMethodAsync(
        InsertSavingsMethodModel model,
        CancellationToken ct);

    // Deletes a plan-level savings method by row id, but only when the row
    // belongs to the given budget — the SQL joins through `Savings.BudgetId`
    // so a stray id from another user can never match. Returns affected row
    // count; callers should treat 0 as a no-op rather than an error so the
    // operation is idempotent under retries.
    Task<int> DeleteSavingsMethodAsync(
        Guid budgetId,
        Guid savingsMethodId,
        CancellationToken ct);

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
