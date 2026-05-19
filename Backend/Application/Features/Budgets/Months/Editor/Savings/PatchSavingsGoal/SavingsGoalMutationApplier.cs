using System.Text.Json;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;

internal static class SavingsGoalMutationApplier
{
    public static async Task<Result<BudgetMonthSavingsGoalEditorRowDto?>> ApplyAsync(
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        BudgetMonthSavingsGoalMutationReadModel existing,
        Guid budgetMonthId,
        Guid actorPersoid,
        DateTime now,
        decimal requestedMonthlyContribution,
        string? requestedScope,
        DateOnly? requestedTargetDate,
        CancellationToken ct)
    {
        var scope = ResolveScope(requestedScope);
        var writesCurrentMonth = BudgetMonthSavingsGoalEditScopes.WritesCurrentMonth(scope);
        var writesBudgetPlan = BudgetMonthSavingsGoalEditScopes.WritesBudgetPlan(scope);

        // Target date is plan-level. It honestly updates the goal only when the
        // scope crosses both current month and plan, so we ignore the requested
        // date for currentMonthOnly / budgetPlanOnly. This keeps the FE gate and
        // the BE behaviour aligned even if a stale client posts a date.
        var dateScopeAllowed = string.Equals(
            scope,
            BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan,
            StringComparison.Ordinal);
        var effectiveTargetDate = dateScopeAllowed ? requestedTargetDate : null;

        var effectiveTargetDateUtc = effectiveTargetDate?.ToDateTime(TimeOnly.MinValue);
        var existingTargetDateDay = existing.TargetDate is null
            ? (DateOnly?)null
            : DateOnly.FromDateTime(existing.TargetDate.Value);
        var targetDateChanged =
            effectiveTargetDate.HasValue &&
            effectiveTargetDate.Value != existingTargetDateDay;

        // Decimal equality compares by value, so 2400.00m == 2400m is true.
        // Treat numerically equal contributions as a no-op so retries don't
        // produce misleading audit rows like "before: 2400.00 / after: 2400".
        var contributionWriteRequested = writesCurrentMonth || writesBudgetPlan;
        var contributionChanged =
            contributionWriteRequested &&
            requestedMonthlyContribution != existing.MonthlyContribution;

        // Any plan-level write (contribution scope crosses into the plan, or a
        // target date change) requires the source goal to exist.
        var needsBaseline =
            (writesBudgetPlan && contributionChanged) ||
            targetDateChanged;
        if (needsBaseline)
        {
            if (existing.SourceSavingsGoalId is null)
                return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                    BudgetMonthSavingsGoalErrors.CannotUpdatePlanForMonthOnlyRow);

            var baselineExists = await repo.BaselineSavingsGoalExistsAsync(
                existing.SourceSavingsGoalId.Value,
                ct);

            if (!baselineExists)
                return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(
                    BudgetMonthSavingsGoalErrors.SourcePlanNotFound);
        }

        if (writesCurrentMonth && contributionChanged)
        {
            await repo.UpdateMonthSavingsGoalContributionAsync(
                new UpdateBudgetMonthSavingsGoalModel(
                    Id: existing.Id,
                    BudgetMonthSavingsId: existing.BudgetMonthSavingsId,
                    MonthlyContribution: requestedMonthlyContribution,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
        }

        if (writesBudgetPlan && contributionChanged)
        {
            await repo.UpdateBaselineSavingsGoalContributionAsync(
                new UpdateBaselineSavingsGoalModel(
                    SavingsGoalId: existing.SourceSavingsGoalId!.Value,
                    MonthlyContribution: requestedMonthlyContribution,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
        }

        var linkedOpenMonthsUpdated = 0;
        if (targetDateChanged)
        {
            // 1. current month row
            await repo.UpdateMonthSavingsGoalTargetDateAsync(
                new UpdateBudgetMonthSavingsGoalTargetDateModel(
                    Id: existing.Id,
                    BudgetMonthSavingsId: existing.BudgetMonthSavingsId,
                    TargetDate: effectiveTargetDateUtc,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);

            // 2. source plan row
            await repo.UpdateBaselineSavingsGoalTargetDateAsync(
                new UpdateBaselineSavingsGoalTargetDateModel(
                    SavingsGoalId: existing.SourceSavingsGoalId!.Value,
                    TargetDate: effectiveTargetDateUtc,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);

            // 3. cascade to other already-materialized open months. Closed and
            //    skipped months are explicitly excluded by the SQL filter.
            linkedOpenMonthsUpdated =
                await repo.UpdateOpenLinkedMonthSavingsGoalTargetDateAsync(
                    new UpdateOpenLinkedMonthSavingsGoalTargetDateModel(
                        SourceSavingsGoalId: existing.SourceSavingsGoalId!.Value,
                        ExcludeMonthGoalId: existing.Id,
                        TargetDate: effectiveTargetDateUtc,
                        ActorPersoid: actorPersoid,
                        UtcNow: now),
                    ct);
        }

        // Build a minimal audit payload that only mentions fields that really
        // changed. A pure no-op skips the audit row entirely so retries stay
        // quiet.
        if (!contributionChanged && !targetDateChanged)
        {
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Success(
                BuildRowDto(existing, contributionChanged: false, requestedMonthlyContribution,
                    targetDateChanged: false, effectiveTargetDateUtc));
        }

        var beforeFields = new Dictionary<string, object?>();
        var afterFields = new Dictionary<string, object?>();
        if (contributionChanged)
        {
            beforeFields["MonthlyContribution"] = existing.MonthlyContribution;
            afterFields["MonthlyContribution"] = requestedMonthlyContribution;
        }
        if (targetDateChanged)
        {
            beforeFields["TargetDate"] = existing.TargetDate;
            afterFields["TargetDate"] = effectiveTargetDateUtc;
        }

        var changeSetJson = JsonSerializer.Serialize(new
        {
            before = beforeFields,
            after = afterFields,
            scope,
            currentMonthUpdated = writesCurrentMonth && contributionChanged,
            baselineUpdated = writesBudgetPlan && contributionChanged,
            targetDateUpdated = targetDateChanged,
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
            BuildRowDto(existing, contributionChanged, requestedMonthlyContribution,
                targetDateChanged, effectiveTargetDateUtc));
    }

    private static BudgetMonthSavingsGoalEditorRowDto BuildRowDto(
        BudgetMonthSavingsGoalMutationReadModel existing,
        bool contributionChanged,
        decimal requestedMonthlyContribution,
        bool targetDateChanged,
        DateTime? effectiveTargetDateUtc)
        => new(
            Id: existing.Id,
            SourceSavingsGoalId: existing.SourceSavingsGoalId,
            Name: existing.Name ?? "",
            TargetAmount: existing.TargetAmount,
            TargetDate: targetDateChanged ? effectiveTargetDateUtc : existing.TargetDate,
            AmountSaved: existing.AmountSaved,
            MonthlyContribution: contributionChanged
                ? requestedMonthlyContribution
                : existing.MonthlyContribution,
            Status: existing.Status,
            IsDeleted: existing.IsDeleted,
            IsMonthOnly: existing.SourceSavingsGoalId is null,
            CanUpdateDefault: existing.SourceSavingsGoalId is not null);

    private static string ResolveScope(string? requestedScope)
    {
        if (!string.IsNullOrWhiteSpace(requestedScope) &&
            BudgetMonthSavingsGoalEditScopes.IsSupported(requestedScope))
        {
            return requestedScope!;
        }

        return BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly;
    }
}
