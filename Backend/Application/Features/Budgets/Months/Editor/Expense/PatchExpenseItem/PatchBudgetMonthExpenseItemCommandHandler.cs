using System.Text.Json;
using Backend.Domain.Shared;
using MediatR;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Application.Features.Budgets.Audit;
using Backend.Domain.Errors.Budget;
using Backend.Application.Features.Budgets.Months.Editor.Models.Expense;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItem;

public sealed class PatchBudgetMonthExpenseItemCommandHandler
    : IRequestHandler<PatchBudgetMonthExpenseItemCommand, Result<BudgetMonthExpenseItemEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthExpenseItemMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthExpenseItemCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthExpenseItemMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result<BudgetMonthExpenseItemEditorRowDto?>> Handle(
        PatchBudgetMonthExpenseItemCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(BudgetMonthExpenseItemErrors.NotFound);

        if (!string.Equals(monthMeta.Status, "open", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetExpenseItemForMutationAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthExpenseItemId,
            ct);

        if (existing is null)
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(BudgetMonthExpenseItemErrors.NotFound);

        if (existing.IsDeleted)
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(BudgetMonthExpenseItemErrors.RowDeleted);

        if (cmd.CategoryId.HasValue)
        {
            var categoryExists = await _repo.ExpenseCategoryExistsAsync(cmd.CategoryId.Value, ct);
            if (!categoryExists)
                return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(BudgetMonthExpenseItemErrors.InvalidCategory);
        }

        var mergedName = string.IsNullOrWhiteSpace(cmd.Name) ? existing.Name : cmd.Name.Trim();
        var mergedCategoryId = cmd.CategoryId ?? existing.CategoryId;
        var mergedAmountMonthly = cmd.AmountMonthly ?? existing.AmountMonthly;
        var mergedIsActive = cmd.IsActive ?? existing.IsActive;
        var lifecycleValidation = ValidateRequestedLifecycleStatus(
            cmd.SubscriptionLifecycleStatus,
            mergedCategoryId);
        if (lifecycleValidation is not null)
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(lifecycleValidation);

        var mergedSubscriptionLifecycleStatus = MergeLifecycleStatus(
            existing.CategoryId,
            existing.SubscriptionLifecycleStatus,
            mergedCategoryId,
            cmd.SubscriptionLifecycleStatus);
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var scope = ResolveScope(cmd);
        var writesCurrentMonth = BudgetMonthExpenseEditScopes.WritesCurrentMonth(scope);
        var writesBudgetPlan = BudgetMonthExpenseEditScopes.WritesBudgetPlan(scope);

        if (writesBudgetPlan)
        {
            if (existing.SourceExpenseItemId is null)
                return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(
                    BudgetMonthExpenseItemErrors.CannotUpdateDefaultForMonthOnlyRow);

            var baselineExists = await _repo.BaselineExpenseItemExistsAsync(existing.SourceExpenseItemId.Value, ct);
            if (!baselineExists)
                return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(
                    BudgetMonthExpenseItemErrors.SourceDefaultNotFound);
        }

        if (writesCurrentMonth)
        {
            await _repo.UpdateMonthExpenseItemAsync(
                new UpdateBudgetMonthExpenseItemModel(
                    Id: existing.Id,
                    BudgetMonthId: ensured.Value.BudgetMonthId,
                    CategoryId: mergedCategoryId,
                    Name: mergedName,
                    AmountMonthly: mergedAmountMonthly,
                    SubscriptionLifecycleStatus: mergedSubscriptionLifecycleStatus,
                    IsActive: mergedIsActive,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
        }

        var baselineUpdated = false;

        if (writesBudgetPlan)
        {
            await _repo.UpdateBaselineExpenseItemAsync(
                new UpdateExpenseItemModel(
                    ExpenseItemId: existing.SourceExpenseItemId!.Value,
                    CategoryId: mergedCategoryId,
                    Name: mergedName,
                    AmountMonthly: mergedAmountMonthly,
                    IsActive: mergedIsActive,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);

            baselineUpdated = true;
        }

        var changeSetJson = JsonSerializer.Serialize(new
        {
            before = new
            {
                existing.Name,
                existing.CategoryId,
                existing.AmountMonthly,
                existing.SubscriptionLifecycleStatus,
                existing.IsActive
            },
            after = new
            {
                Name = mergedName,
                CategoryId = mergedCategoryId,
                AmountMonthly = mergedAmountMonthly,
                SubscriptionLifecycleStatus = mergedSubscriptionLifecycleStatus,
                IsActive = mergedIsActive
            },
            scope,
            currentMonthUpdated = writesCurrentMonth,
            UpdateDefault = writesBudgetPlan,
            baselineUpdated
        });

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: ensured.Value.BudgetMonthId,
                EntityType: BudgetAuditEntityTypes.ExpenseItem,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceExpenseItemId,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthExpenseItemEditorRowDto?>.Success(
            new BudgetMonthExpenseItemEditorRowDto(
                Id: existing.Id,
                SourceExpenseItemId: existing.SourceExpenseItemId,
                CategoryId: writesCurrentMonth ? mergedCategoryId : existing.CategoryId,
                Name: writesCurrentMonth ? mergedName : existing.Name,
                AmountMonthly: writesCurrentMonth ? mergedAmountMonthly : existing.AmountMonthly,
                SubscriptionLifecycleStatus: writesCurrentMonth
                    ? mergedSubscriptionLifecycleStatus
                    : existing.SubscriptionLifecycleStatus,
                IsActive: writesCurrentMonth ? mergedIsActive : existing.IsActive,
                IsDeleted: existing.IsDeleted,
                IsMonthOnly: existing.SourceExpenseItemId is null,
                CanUpdateDefault: existing.SourceExpenseItemId is not null,
                // Mutation responses do not re-read the source plan row; the
                // editor query is the source of truth for plan-comparison
                // fields. Clients should refetch the editor after mutations to
                // observe up-to-date Source* values.
                SourceCategoryId: null,
                SourceName: null,
                SourceAmountMonthly: null,
                SourceIsActive: null));
    }

    private static string ResolveScope(PatchBudgetMonthExpenseItemCommand cmd)
    {
        if (!string.IsNullOrWhiteSpace(cmd.Scope) &&
            BudgetMonthExpenseEditScopes.IsSupported(cmd.Scope))
        {
            return cmd.Scope!;
        }

        return cmd.UpdateDefault
            ? BudgetMonthExpenseEditScopes.CurrentMonthAndBudgetPlan
            : BudgetMonthExpenseEditScopes.CurrentMonthOnly;
    }

    private static string? MergeLifecycleStatus(
        Guid existingCategoryId,
        string? existingLifecycleStatus,
        Guid mergedCategoryId,
        string? requestedLifecycleStatus)
    {
        if (mergedCategoryId != ExpenseCategoryIds.Subscription)
            return null;

        if (requestedLifecycleStatus is not null)
            return requestedLifecycleStatus;

        if (existingCategoryId == ExpenseCategoryIds.Subscription &&
            BudgetMonthSubscriptionLifecycleStatuses.IsSupported(existingLifecycleStatus))
        {
            return existingLifecycleStatus;
        }

        return BudgetMonthSubscriptionLifecycleStatuses.Active;
    }

    private static Error? ValidateRequestedLifecycleStatus(
        string? requestedLifecycleStatus,
        Guid mergedCategoryId)
    {
        if (requestedLifecycleStatus is null)
            return null;

        if (!BudgetMonthSubscriptionLifecycleStatuses.IsSupported(requestedLifecycleStatus))
            return BudgetMonthExpenseItemErrors.InvalidSubscriptionLifecycleStatus;

        if (mergedCategoryId != ExpenseCategoryIds.Subscription)
            return BudgetMonthExpenseItemErrors.SubscriptionLifecycleRequiresSubscriptionCategory;

        return null;
    }
}
