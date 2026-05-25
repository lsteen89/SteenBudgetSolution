using System.Text.Json;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.RenameSavingsGoal;

/// <summary>
/// Applies a V2 goal rename across the three places where the name lives:
/// the current-month snapshot, the source plan row (when present), and any
/// other already-materialised open months pointing at the same source. The
/// editor list query reads <c>g.Name</c> straight from the snapshot, so a
/// rename that only touched the source plan would leave already-open
/// future months stale. Closed/skipped months are intentionally left
/// alone — the archive view ("Tidigare mål") should keep showing the
/// name a goal was closed under.
///
/// Mirrors the no-op + audit shape of
/// <see cref="PatchSavingsGoal.SavingsGoalMutationApplier"/>: a request
/// that does not change the stored value short-circuits without writing
/// either a row or an audit event, so retries stay quiet.
/// </summary>
internal static class SavingsGoalRenameApplier
{
    public static async Task<Result<BudgetMonthSavingsGoalEditorRowDto?>> ApplyAsync(
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        BudgetMonthSavingsGoalMutationReadModel existing,
        Guid budgetMonthId,
        Guid actorPersoid,
        DateTime now,
        string newName,
        CancellationToken ct)
    {
        var oldName = existing.Name ?? string.Empty;
        var nameChanged = !string.Equals(oldName, newName, StringComparison.Ordinal);

        if (!nameChanged)
        {
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Success(BuildRowDto(existing, oldName));
        }

        if (existing.SourceSavingsGoalId is Guid baselineSourceId)
        {
            var baselineExists = await repo.BaselineSavingsGoalExistsAsync(baselineSourceId, ct);
            if (!baselineExists)
                return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                    BudgetMonthSavingsGoalErrors.SourcePlanNotFound);
        }

        // 1. Current-month snapshot — always writes (the row is loaded above).
        await repo.UpdateMonthSavingsGoalNameAsync(
            new UpdateBudgetMonthSavingsGoalNameModel(
                Id: existing.Id,
                BudgetMonthSavingsId: existing.BudgetMonthSavingsId,
                Name: newName,
                ActorPersoid: actorPersoid,
                UtcNow: now),
            ct);

        var linkedOpenMonthsUpdated = 0;
        var baselineUpdated = false;

        if (existing.SourceSavingsGoalId is Guid sourceId)
        {
            // 2. Source plan row — drives the value for newly materialised months.
            await repo.UpdateBaselineSavingsGoalNameAsync(
                new UpdateBaselineSavingsGoalNameModel(
                    SavingsGoalId: sourceId,
                    Name: newName,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
            baselineUpdated = true;

            // 3. Other already-materialised open months — keep them in sync so
            //    "Buffert" doesn't appear as "Buffert" in May and "Buffert (ny)"
            //    in June. Closed / skipped months are excluded by the SQL.
            linkedOpenMonthsUpdated = await repo.UpdateOpenLinkedMonthSavingsGoalNameAsync(
                new UpdateOpenLinkedMonthSavingsGoalNameModel(
                    SourceSavingsGoalId: sourceId,
                    ExcludeMonthGoalId: existing.Id,
                    Name: newName,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
        }

        var changeSetJson = JsonSerializer.Serialize(new
        {
            before = new { Name = oldName },
            after = new { Name = newName },
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

        return Result<BudgetMonthSavingsGoalEditorRowDto?>.Success(BuildRowDto(existing, newName));
    }

    private static BudgetMonthSavingsGoalEditorRowDto BuildRowDto(
        BudgetMonthSavingsGoalMutationReadModel existing,
        string effectiveName)
        => new(
            Id: existing.Id,
            SourceSavingsGoalId: existing.SourceSavingsGoalId,
            Name: effectiveName,
            TargetAmount: existing.TargetAmount,
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
