using System.Text.Json;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.ChangeSavingsGoalTargetAmount;

/// <summary>
/// Applies a V2 target-amount change across the three places where the value
/// lives: the current-month snapshot, the source plan row (when present),
/// and any other already-materialised open months pointing at the same
/// source. The editor list query reads <c>g.TargetAmount</c> straight from
/// the snapshot, so updating only the source plan would leave already-open
/// future months stale. Closed/skipped months are intentionally left alone
/// — the archive view ("Tidigare mål") should keep showing the amount a
/// goal was closed under.
///
/// Mirrors the no-op + audit shape of the rename applier: a request that
/// does not change the stored value short-circuits without writing either
/// a row or an audit event, so retries stay quiet.
/// </summary>
internal static class SavingsGoalTargetAmountApplier
{
    public static async Task<Result<BudgetMonthSavingsGoalEditorRowDto?>> ApplyAsync(
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        BudgetMonthSavingsGoalMutationReadModel existing,
        Guid budgetMonthId,
        Guid actorPersoid,
        DateTime now,
        decimal newTargetAmount,
        CancellationToken ct)
    {
        // Decimal equality compares by value, so 50000.00m == 50000m is true.
        // Treat numerically equal targets as a no-op so retries don't
        // produce misleading audit rows like "before: 50000.00 / after: 50000".
        var oldTargetAmount = existing.TargetAmount;
        var targetChanged =
            !oldTargetAmount.HasValue ||
            oldTargetAmount.Value != newTargetAmount;

        if (!targetChanged)
        {
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Success(
                BuildRowDto(existing, oldTargetAmount));
        }

        // Source-plan presence is required for any plan-level write — mirrors
        // the guard `SavingsGoalMutationApplier.cs:62–75` and
        // `SavingsGoalRenameApplier.cs:47–53`. For a detached (month-only)
        // row we never look at the baseline.
        if (existing.SourceSavingsGoalId is Guid baselineSourceId)
        {
            var baselineExists = await repo.BaselineSavingsGoalExistsAsync(baselineSourceId, ct);
            if (!baselineExists)
                return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                    BudgetMonthSavingsGoalErrors.SourcePlanNotFound);
        }

        // 1. Current-month snapshot — always writes (the row is loaded above).
        await repo.UpdateMonthSavingsGoalTargetAmountAsync(
            new UpdateBudgetMonthSavingsGoalTargetAmountModel(
                Id: existing.Id,
                BudgetMonthSavingsId: existing.BudgetMonthSavingsId,
                TargetAmount: newTargetAmount,
                ActorPersoid: actorPersoid,
                UtcNow: now),
            ct);

        var linkedOpenMonthsUpdated = 0;
        var baselineUpdated = false;

        if (existing.SourceSavingsGoalId is Guid sourceId)
        {
            // 2. Source plan row — drives the value for newly materialised months.
            await repo.UpdateBaselineSavingsGoalTargetAmountAsync(
                new UpdateBaselineSavingsGoalTargetAmountModel(
                    SavingsGoalId: sourceId,
                    TargetAmount: newTargetAmount,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
            baselineUpdated = true;

            // 3. Other already-materialised open months — keep them in sync.
            //    Closed / skipped months are excluded by the SQL.
            linkedOpenMonthsUpdated = await repo.UpdateOpenLinkedMonthSavingsGoalTargetAmountAsync(
                new UpdateOpenLinkedMonthSavingsGoalTargetAmountModel(
                    SourceSavingsGoalId: sourceId,
                    ExcludeMonthGoalId: existing.Id,
                    TargetAmount: newTargetAmount,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
        }

        var changeSetJson = JsonSerializer.Serialize(new
        {
            before = new { TargetAmount = oldTargetAmount },
            after = new { TargetAmount = (decimal?)newTargetAmount },
            baselineUpdated,
            linkedOpenMonthsUpdated,
        });

        await changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: budgetMonthId,
                EntityType: BudgetAuditEntityTypes.SavingsGoal,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceSavingsGoalId,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: actorPersoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthSavingsGoalEditorRowDto?>.Success(
            BuildRowDto(existing, newTargetAmount));
    }

    private static BudgetMonthSavingsGoalEditorRowDto BuildRowDto(
        BudgetMonthSavingsGoalMutationReadModel existing,
        decimal? effectiveTargetAmount)
        => new(
            Id: existing.Id,
            SourceSavingsGoalId: existing.SourceSavingsGoalId,
            Name: existing.Name ?? string.Empty,
            TargetAmount: effectiveTargetAmount,
            TargetDate: existing.TargetDate,
            AmountSaved: existing.AmountSaved,
            MonthlyContribution: existing.MonthlyContribution,
            Status: existing.Status,
            ClosedReason: existing.ClosedReason,
            ClosedAt: existing.ClosedAt,
            IsDeleted: existing.IsDeleted,
            IsMonthOnly: existing.SourceSavingsGoalId is null,
            CanUpdateDefault: existing.SourceSavingsGoalId is not null);
}
