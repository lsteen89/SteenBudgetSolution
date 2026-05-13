using System.Text.Json;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Income;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;

internal static class IncomeMutationApplier
{
    public static async Task<Result<BudgetMonthIncomeItemEditorRowDto?>> ApplyAsync(
        IBudgetMonthIncomeItemMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        BudgetMonthIncomeItemMutationReadModel existing,
        Guid budgetMonthId,
        Guid actorPersoid,
        DateTime now,
        string? requestedName,
        decimal? requestedAmountMonthly,
        bool? requestedIsActive,
        bool updateDefault,
        string? requestedScope,
        CancellationToken ct)
    {
        var scope = ResolveScope(updateDefault, requestedScope);
        var writesCurrentMonth = BudgetMonthIncomeEditScopes.WritesCurrentMonth(scope);
        var writesBudgetPlan = BudgetMonthIncomeEditScopes.WritesBudgetPlan(scope);

        if (writesBudgetPlan)
        {
            if (existing.SourceIncomeItemId is null)
                return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(
                    BudgetMonthIncomeItemErrors.CannotUpdatePlanForMonthOnlyRow);

            var baselineExists = await repo.BaselineIncomeItemExistsAsync(
                existing.Kind,
                existing.SourceIncomeItemId.Value,
                ct);

            if (!baselineExists)
                return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(
                    BudgetMonthIncomeItemErrors.SourcePlanNotFound);
        }

        var isSalary = existing.Kind == BudgetMonthIncomeItemKinds.Salary;
        var existingName = isSalary ? "Net salary" : existing.Name ?? "";
        var mergedName = isSalary
            ? existingName
            : string.IsNullOrWhiteSpace(requestedName)
                ? existingName
                : requestedName.Trim();

        var mergedAmountMonthly = requestedAmountMonthly ?? existing.AmountMonthly;
        var mergedIsActive = isSalary
            ? true
            : requestedIsActive ?? existing.IsActive;

        if (writesCurrentMonth)
        {
            await repo.UpdateMonthIncomeItemAsync(
                new UpdateBudgetMonthIncomeItemModel(
                    Id: existing.Id,
                    BudgetMonthIncomeId: existing.BudgetMonthIncomeId,
                    Kind: existing.Kind,
                    Name: mergedName,
                    AmountMonthly: mergedAmountMonthly,
                    IsActive: mergedIsActive,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);
        }

        var baselineUpdated = false;

        if (writesBudgetPlan)
        {
            await repo.UpdateBaselineIncomeItemAsync(
                new UpdateBaselineIncomeItemModel(
                    IncomeItemId: existing.SourceIncomeItemId!.Value,
                    Kind: existing.Kind,
                    Name: isSalary ? null : mergedName,
                    AmountMonthly: mergedAmountMonthly,
                    IsActive: mergedIsActive,
                    ActorPersoid: actorPersoid,
                    UtcNow: now),
                ct);

            baselineUpdated = true;
        }

        var changeSetJson = JsonSerializer.Serialize(new
        {
            before = new
            {
                existing.Kind,
                Name = existingName,
                existing.AmountMonthly,
                existing.IsActive
            },
            after = new
            {
                existing.Kind,
                Name = mergedName,
                AmountMonthly = mergedAmountMonthly,
                IsActive = mergedIsActive
            },
            scope,
            currentMonthUpdated = writesCurrentMonth,
            UpdateDefault = writesBudgetPlan,
            baselineUpdated
        });

        await changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: budgetMonthId,
                EntityType: BudgetAuditEntityTypes.IncomeItem,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceIncomeItemId,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: actorPersoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthIncomeItemEditorRowDto?>.Success(
            new BudgetMonthIncomeItemEditorRowDto(
                Id: existing.Id,
                SourceIncomeItemId: existing.SourceIncomeItemId,
                Kind: existing.Kind,
                Name: writesCurrentMonth ? mergedName : existingName,
                AmountMonthly: writesCurrentMonth ? mergedAmountMonthly : existing.AmountMonthly,
                IsActive: writesCurrentMonth ? mergedIsActive : existing.IsActive,
                IsDeleted: existing.IsDeleted,
                IsMonthOnly: existing.SourceIncomeItemId is null,
                CanUpdateDefault: existing.SourceIncomeItemId is not null));
    }

    private static string ResolveScope(bool updateDefault, string? requestedScope)
    {
        if (!string.IsNullOrWhiteSpace(requestedScope) &&
            BudgetMonthIncomeEditScopes.IsSupported(requestedScope))
        {
            return requestedScope!;
        }

        return updateDefault
            ? BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan
            : BudgetMonthIncomeEditScopes.CurrentMonthOnly;
    }
}

