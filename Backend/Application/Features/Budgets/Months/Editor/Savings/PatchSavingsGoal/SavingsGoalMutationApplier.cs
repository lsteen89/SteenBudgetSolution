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
        CancellationToken ct)
    {
        var scope = ResolveScope(requestedScope);
        var writesCurrentMonth = BudgetMonthSavingsGoalEditScopes.WritesCurrentMonth(scope);
        var writesBudgetPlan = BudgetMonthSavingsGoalEditScopes.WritesBudgetPlan(scope);

        if (writesBudgetPlan)
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

        if (writesCurrentMonth)
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

        if (writesBudgetPlan)
        {
            await repo.UpdateBaselineSavingsGoalContributionAsync(
                new UpdateBaselineSavingsGoalModel(
                    SavingsGoalId: existing.SourceSavingsGoalId!.Value,
                    MonthlyContribution: requestedMonthlyContribution,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
        }

        var changeSetJson = JsonSerializer.Serialize(new
        {
            before = new { existing.MonthlyContribution },
            after = new { MonthlyContribution = requestedMonthlyContribution },
            scope,
            currentMonthUpdated = writesCurrentMonth,
            baselineUpdated = writesBudgetPlan
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
            new BudgetMonthSavingsGoalEditorRowDto(
                Id: existing.Id,
                SourceSavingsGoalId: existing.SourceSavingsGoalId,
                Name: existing.Name ?? "",
                TargetAmount: existing.TargetAmount,
                TargetDate: existing.TargetDate,
                AmountSaved: existing.AmountSaved,
                MonthlyContribution: writesCurrentMonth ? requestedMonthlyContribution : existing.MonthlyContribution,
                Status: existing.Status,
                IsDeleted: existing.IsDeleted,
                IsMonthOnly: existing.SourceSavingsGoalId is null,
                CanUpdateDefault: existing.SourceSavingsGoalId is not null));
    }

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
