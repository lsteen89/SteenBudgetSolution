using System.Text.Json;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.Lifecycle;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.CloseBudgetMonth;

// Handles "complete these goals as part of closing the month".
//
// Runs inside the close-month transaction (the close command is
// ITransactionalCommand), so a failure here rolls the entire close back.
// Behaviour mirrors the single-goal CompleteBudgetMonthSavingsGoal handler —
// same applier, same persistence calls, same audit shape — but the audit
// payload is tagged with source="closeMonth" so historic queries can tell
// the two flows apart.
//
// Important: this does NOT mutate AmountSaved. Completion is purely a
// lifecycle transition; AmountSaved continues to be user-maintained.
internal static class CloseMonthSavingsGoalCompletionApplier
{
    public static async Task<Result> ApplyAsync(
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        Guid budgetMonthId,
        IReadOnlyCollection<Guid> selectedGoalIds,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
    {
        if (selectedGoalIds.Count == 0)
            return Result.Success();

        // Reject duplicate IDs early — duplicates would otherwise re-run the
        // applier against an already-closed row and trip AlreadyClosed.
        var distinct = selectedGoalIds.Distinct().ToArray();
        if (distinct.Length != selectedGoalIds.Count)
            return Result.Failure(BudgetMonth.DuplicateSavingsGoalCompletionCandidate);

        // Recompute candidates server-side. The frontend may suggest IDs but
        // the backend is the source of truth: any ID that is not currently a
        // candidate (deleted, closed, no target, target not met, wrong month)
        // fails the whole close.
        var candidates = await repo.GetCompletionCandidatesAsync(budgetMonthId, ct);
        var candidateIds = candidates.Select(c => c.Id).ToHashSet();

        if (distinct.Any(id => !candidateIds.Contains(id)))
            return Result.Failure(BudgetMonth.InvalidSavingsGoalCompletionCandidate);

        foreach (var goalId in distinct)
        {
            var step = await CompleteOneAsync(
                repo,
                changeEvents,
                budgetMonthId,
                goalId,
                actorPersoid,
                nowUtc,
                ct);

            if (step.IsFailure)
                return step;
        }

        return Result.Success();
    }

    private static async Task<Result> CompleteOneAsync(
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        Guid budgetMonthId,
        Guid monthSavingsGoalId,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
    {
        var existing = await repo.GetSavingsGoalForMutationAsync(budgetMonthId, monthSavingsGoalId, ct);
        if (existing is null)
            return Result.Failure(BudgetMonth.InvalidSavingsGoalCompletionCandidate);
        if (existing.IsDeleted)
            return Result.Failure(BudgetMonth.InvalidSavingsGoalCompletionCandidate);

        var currentSnapshot = new SavingsGoalLifecycleSnapshot(
            Status: existing.Status,
            ClosedReason: existing.ClosedReason,
            ClosedAt: existing.ClosedAt);

        var monthTransition = SavingsGoalLifecycleApplier.ApplyToMonthGoal(
            currentSnapshot,
            SavingsGoalLifecycleActions.Complete,
            nowUtc);
        if (monthTransition.IsFailure)
            return Result.Failure(monthTransition.Error!);

        SavingsGoalLifecycleSnapshot? sourceSnapshot = null;
        if (existing.SourceSavingsGoalId is not null)
        {
            var source = await repo.GetSourceSavingsGoalLifecycleAsync(
                existing.SourceSavingsGoalId.Value,
                ct);
            if (source is null)
                return Result.Failure(BudgetMonthSavingsGoalErrors.SourcePlanNotFound);

            sourceSnapshot = new SavingsGoalLifecycleSnapshot(
                Status: source.Status,
                ClosedReason: source.ClosedReason,
                ClosedAt: source.ClosedAt);
        }

        var sourceTransition = SavingsGoalLifecycleApplier.ApplyToSourceGoalIfLinked(
            sourceSnapshot,
            SavingsGoalLifecycleActions.Complete,
            nowUtc);
        if (sourceTransition.IsFailure)
            return Result.Failure(sourceTransition.Error!);

        await repo.UpdateMonthSavingsGoalLifecycleAsync(
            new UpdateBudgetMonthSavingsGoalLifecycleModel(
                Id: existing.Id,
                BudgetMonthSavingsId: existing.BudgetMonthSavingsId,
                Status: monthTransition.Value!.After.Status,
                ClosedReason: monthTransition.Value.After.ClosedReason,
                ClosedAt: monthTransition.Value.After.ClosedAt,
                // "Complete" never flips IsDeleted — the row stays visible so
                // closed-month recap can surface it as completed history.
                IsDeleted: false,
                ActorPersoid: actorPersoid,
                UtcNow: nowUtc),
            ct);

        if (sourceTransition.Value is not null && existing.SourceSavingsGoalId is not null)
        {
            await repo.UpdateBaselineSavingsGoalLifecycleAsync(
                new UpdateBaselineSavingsGoalLifecycleModel(
                    SavingsGoalId: existing.SourceSavingsGoalId.Value,
                    Status: sourceTransition.Value.After.Status,
                    ClosedReason: sourceTransition.Value.After.ClosedReason,
                    ClosedAt: sourceTransition.Value.After.ClosedAt,
                    ActorPersoid: actorPersoid,
                    UtcNow: nowUtc),
                ct);

            // A pre-existing next open month may already carry the same
            // source goal as an active row. Idempotently close those so the
            // user does not see the completed goal still asking for a
            // contribution after the month rolls over.
            await repo.CloseLinkedActiveMonthSavingsGoalsForSourceAsync(
                sourceSavingsGoalId: existing.SourceSavingsGoalId.Value,
                excludeMonthGoalId: existing.Id,
                closedReason: SavingsGoalClosedReasons.Completed,
                closedAtUtc: nowUtc,
                actorPersoid: actorPersoid,
                ct: ct);
        }

        var monthBefore = monthTransition.Value.Before;
        var monthAfter = monthTransition.Value.After;

        var auditPayload = new
        {
            action = "completeSavingsGoal",
            // Differentiates the audit row from the individual lifecycle
            // endpoint; queries against historic audit data can attribute
            // this completion to the close-month flow.
            source = "closeMonth",
            monthGoalId = existing.Id,
            sourceSavingsGoalId = existing.SourceSavingsGoalId,
            before = new
            {
                Status = monthBefore.Status,
                ClosedReason = monthBefore.ClosedReason,
                ClosedAt = monthBefore.ClosedAt,
                IsDeleted = existing.IsDeleted,
            },
            after = new
            {
                Status = monthAfter.Status,
                ClosedReason = monthAfter.ClosedReason,
                ClosedAt = monthAfter.ClosedAt,
                IsDeleted = false,
            },
            source_row = sourceTransition.Value is null
                ? null
                : new
                {
                    before = new
                    {
                        Status = sourceSnapshot!.Status,
                        ClosedReason = sourceSnapshot.ClosedReason,
                        ClosedAt = sourceSnapshot.ClosedAt,
                    },
                    after = new
                    {
                        Status = sourceTransition.Value.After.Status,
                        ClosedReason = sourceTransition.Value.After.ClosedReason,
                        ClosedAt = sourceTransition.Value.After.ClosedAt,
                    },
                },
        };

        await changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: budgetMonthId,
                EntityType: BudgetAuditEntityTypes.SavingsGoal,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceSavingsGoalId,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: JsonSerializer.Serialize(auditPayload),
                ChangedByUserId: actorPersoid,
                ChangedAt: nowUtc),
            ct);

        return Result.Success();
    }
}
