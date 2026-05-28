using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.Lifecycle;

// Shared transition logic for the three lifecycle endpoints (complete /
// cancel / remove). Built on top of SavingsGoalLifecycleApplier so the rules
// for "what is a legal transition" live in exactly one place. Each public
// command handler is a thin wrapper that picks the action verb and calls
// ApplyAsync — no duplicated load / validate / write / audit flow.
internal static class BudgetMonthSavingsGoalLifecycleHandler
{
    public static async Task<Result<BudgetMonthSavingsGoalEditorRowDto?>> ApplyAsync(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider,
        Guid persoid,
        string yearMonth,
        Guid monthSavingsGoalId,
        string action,
        CancellationToken ct)
    {
        if (!SavingsGoalLifecycleActions.IsSupported(action))
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                SavingsGoalLifecycleErrors.UnknownAction);

        var ensured = await lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, yearMonth, ct);
        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(ensured.Error!);

        var budgetMonthId = ensured.Value.BudgetMonthId;
        var monthMeta = await repo.GetBudgetMonthMetaAsync(budgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonth.NotFound);

        // Mirrors the gate used by Patch/Create — closed and skipped months
        // surface the same BudgetMonth.MonthIsClosed code so the frontend has
        // one place to react to "month is locked" across all editors.
        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await repo.GetSavingsGoalForMutationAsync(budgetMonthId, monthSavingsGoalId, ct);
        if (existing is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonthSavingsGoalErrors.NotFound);

        if (existing.IsDeleted)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonthSavingsGoalErrors.RowDeleted);

        var currentSnapshot = new SavingsGoalLifecycleSnapshot(
            Status: existing.Status,
            ClosedReason: existing.ClosedReason,
            ClosedAt: existing.ClosedAt);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var monthTransition = SavingsGoalLifecycleApplier.ApplyToMonthGoal(currentSnapshot, action, now);
        if (monthTransition.IsFailure)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(monthTransition.Error!);

        // For source-linked goals, load the plan-row snapshot now so the same
        // transaction can update both rows. Month-only goals (no source link)
        // produce a Success(null) here and skip the plan-side write entirely.
        SavingsGoalLifecycleSnapshot? sourceSnapshot = null;
        if (existing.SourceSavingsGoalId is not null)
        {
            var source = await repo.GetSourceSavingsGoalLifecycleAsync(
                existing.SourceSavingsGoalId.Value,
                ct);

            if (source is null)
                return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                    BudgetMonthSavingsGoalErrors.SourcePlanNotFound);

            sourceSnapshot = new SavingsGoalLifecycleSnapshot(
                Status: source.Status,
                ClosedReason: source.ClosedReason,
                ClosedAt: source.ClosedAt);
        }

        var sourceTransition = SavingsGoalLifecycleApplier.ApplyToSourceGoalIfLinked(
            sourceSnapshot,
            action,
            now);
        if (sourceTransition.IsFailure)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(sourceTransition.Error!);

        // "remove" is the only action that flips IsDeleted on the month row;
        // complete and cancel keep the row visible so the recap and editor can
        // still surface it as a closed entry.
        var markMonthDeleted = string.Equals(
            action,
            SavingsGoalLifecycleActions.Remove,
            StringComparison.Ordinal);

        await repo.UpdateMonthSavingsGoalLifecycleAsync(
            new UpdateBudgetMonthSavingsGoalLifecycleModel(
                Id: existing.Id,
                BudgetMonthSavingsId: existing.BudgetMonthSavingsId,
                Status: monthTransition.Value!.After.Status,
                ClosedReason: monthTransition.Value.After.ClosedReason,
                ClosedAt: monthTransition.Value.After.ClosedAt,
                IsDeleted: markMonthDeleted,
                ActorPersoid: persoid,
                UtcNow: now),
            ct);

        if (sourceTransition.Value is not null && existing.SourceSavingsGoalId is not null)
        {
            await repo.UpdateBaselineSavingsGoalLifecycleAsync(
                new UpdateBaselineSavingsGoalLifecycleModel(
                    SavingsGoalId: existing.SourceSavingsGoalId.Value,
                    Status: sourceTransition.Value.After.Status,
                    ClosedReason: sourceTransition.Value.After.ClosedReason,
                    ClosedAt: sourceTransition.Value.After.ClosedAt,
                    ActorPersoid: persoid,
                    UtcNow: now),
                ct);
        }

        var monthBefore = monthTransition.Value.Before;
        var monthAfter = monthTransition.Value.After;

        var auditPayload = new
        {
            action = ToAuditActionName(action),
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
                IsDeleted = markMonthDeleted,
            },
            source = sourceTransition.Value is null
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
                // Lifecycle transitions are not deletes in the audit sense
                // ("removed" is a closure reason, not a hard delete) so they
                // all share the Updated change type.
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: JsonSerializer.Serialize(auditPayload),
                ChangedByUserId: persoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthSavingsGoalEditorRowDto?>.Success(
            BuildRowDto(existing, monthAfter, markMonthDeleted));
    }

    private static BudgetMonthSavingsGoalEditorRowDto BuildRowDto(
        BudgetMonthSavingsGoalMutationReadModel existing,
        SavingsGoalLifecycleSnapshot after,
        bool isDeleted)
        => new(
            Id: existing.Id,
            SourceSavingsGoalId: existing.SourceSavingsGoalId,
            Name: existing.Name ?? "",
            TargetAmount: existing.TargetAmount,
            TargetDate: existing.TargetDate,
            AmountSaved: existing.AmountSaved,
            MonthlyContribution: existing.MonthlyContribution,
            Status: after.Status,
            ClosedReason: after.ClosedReason,
            ClosedAt: after.ClosedAt,
            IsDeleted: isDeleted,
            IsMonthOnly: existing.SourceSavingsGoalId is null,
            CanUpdateDefault: false);

    private static string ToAuditActionName(string action) => action switch
    {
        SavingsGoalLifecycleActions.Complete => "completeSavingsGoal",
        SavingsGoalLifecycleActions.Cancel => "cancelSavingsGoal",
        SavingsGoalLifecycleActions.Remove => "removeSavingsGoal",
        _ => action,
    };
}
