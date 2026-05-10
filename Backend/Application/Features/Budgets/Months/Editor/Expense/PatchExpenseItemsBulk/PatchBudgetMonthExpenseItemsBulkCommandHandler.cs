using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Expense;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItemsBulk;

/// <summary>
/// Applies a transactional bulk patch over many <c>BudgetMonthExpenseItem</c> rows.
/// The handler runs inside a single UoW transaction (see <c>ITransactionalCommand</c>
/// + <c>UnitOfWorkPipelineBehavior</c>): any failure — domain or infrastructure —
/// rolls back every row, and the audit trail stays consistent.
///
/// Per-row logic mirrors <c>PatchBudgetMonthExpenseItemCommandHandler</c> exactly so
/// the bulk and single-row contracts remain in sync.
/// </summary>
public sealed class PatchBudgetMonthExpenseItemsBulkCommandHandler
    : IRequestHandler<
        PatchBudgetMonthExpenseItemsBulkCommand,
        Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthExpenseItemMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthExpenseItemsBulkCommandHandler(
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

    public async Task<Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>> Handle(
        PatchBudgetMonthExpenseItemsBulkCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>.Failure(ensured.Error!);

        var budgetMonthId = ensured.Value.BudgetMonthId;

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(budgetMonthId, ct);
        if (monthMeta is null)
            return Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>.Failure(BudgetMonthExpenseItemErrors.NotFound);

        if (!string.Equals(monthMeta.Status, "open", StringComparison.OrdinalIgnoreCase))
            return Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>.Failure(BudgetMonth.MonthIsClosed);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var updatedRows = new List<BudgetMonthExpenseItemEditorRowDto>(cmd.Items.Count);

        // Walk rows in input order. Any business failure short-circuits and the
        // pipeline behavior rolls the transaction back — no partial saves.
        foreach (var row in cmd.Items)
        {
            var rowResult = await ApplyRowAsync(budgetMonthId, row, cmd.Persoid, now, ct);
            if (rowResult.IsFailure || rowResult.Value is null)
                return Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>.Failure(rowResult.Error!);

            updatedRows.Add(rowResult.Value);
        }

        return Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>
            .Success(updatedRows);
    }

    private async Task<Result<BudgetMonthExpenseItemEditorRowDto>> ApplyRowAsync(
        Guid budgetMonthId,
        PatchBudgetMonthExpenseItemsBulkCommand.Row row,
        Guid actorPersoid,
        DateTime now,
        CancellationToken ct)
    {
        var existing = await _repo.GetExpenseItemForMutationAsync(
            budgetMonthId,
            row.MonthExpenseItemId,
            ct);

        if (existing is null)
            return Result<BudgetMonthExpenseItemEditorRowDto>.Failure(BudgetMonthExpenseItemErrors.NotFound);

        if (existing.IsDeleted)
            return Result<BudgetMonthExpenseItemEditorRowDto>.Failure(BudgetMonthExpenseItemErrors.RowDeleted);

        if (row.CategoryId.HasValue)
        {
            var categoryExists = await _repo.ExpenseCategoryExistsAsync(row.CategoryId.Value, ct);
            if (!categoryExists)
                return Result<BudgetMonthExpenseItemEditorRowDto>.Failure(BudgetMonthExpenseItemErrors.InvalidCategory);
        }

        var mergedName = string.IsNullOrWhiteSpace(row.Name) ? existing.Name : row.Name.Trim();
        var mergedCategoryId = row.CategoryId ?? existing.CategoryId;
        var mergedAmountMonthly = row.AmountMonthly ?? existing.AmountMonthly;
        var mergedIsActive = row.IsActive ?? existing.IsActive;

        var lifecycleValidation = ValidateRequestedLifecycleStatus(
            row.SubscriptionLifecycleStatus,
            mergedCategoryId);
        if (lifecycleValidation is not null)
            return Result<BudgetMonthExpenseItemEditorRowDto>.Failure(lifecycleValidation);

        var mergedSubscriptionLifecycleStatus = MergeLifecycleStatus(
            existing.CategoryId,
            existing.SubscriptionLifecycleStatus,
            mergedCategoryId,
            row.SubscriptionLifecycleStatus);

        if (row.UpdateDefault)
        {
            if (existing.SourceExpenseItemId is null)
                return Result<BudgetMonthExpenseItemEditorRowDto>.Failure(
                    BudgetMonthExpenseItemErrors.CannotUpdateDefaultForMonthOnlyRow);

            var baselineExists = await _repo.BaselineExpenseItemExistsAsync(existing.SourceExpenseItemId.Value, ct);
            if (!baselineExists)
                return Result<BudgetMonthExpenseItemEditorRowDto>.Failure(
                    BudgetMonthExpenseItemErrors.SourceDefaultNotFound);
        }

        await _repo.UpdateMonthExpenseItemAsync(
            new UpdateBudgetMonthExpenseItemModel(
                Id: existing.Id,
                BudgetMonthId: budgetMonthId,
                CategoryId: mergedCategoryId,
                Name: mergedName,
                AmountMonthly: mergedAmountMonthly,
                SubscriptionLifecycleStatus: mergedSubscriptionLifecycleStatus,
                IsActive: mergedIsActive,
                ActorPersoid: actorPersoid,
                UtcNow: now),
            ct);

        var baselineUpdated = false;

        if (row.UpdateDefault)
        {
            await _repo.UpdateBaselineExpenseItemAsync(
                new UpdateExpenseItemModel(
                    ExpenseItemId: existing.SourceExpenseItemId!.Value,
                    CategoryId: mergedCategoryId,
                    Name: mergedName,
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
            UpdateDefault = row.UpdateDefault,
            baselineUpdated
        });

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: budgetMonthId,
                EntityType: BudgetAuditEntityTypes.ExpenseItem,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceExpenseItemId,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: actorPersoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthExpenseItemEditorRowDto>.Success(
            new BudgetMonthExpenseItemEditorRowDto(
                Id: existing.Id,
                SourceExpenseItemId: existing.SourceExpenseItemId,
                CategoryId: mergedCategoryId,
                Name: mergedName,
                AmountMonthly: mergedAmountMonthly,
                SubscriptionLifecycleStatus: mergedSubscriptionLifecycleStatus,
                IsActive: mergedIsActive,
                IsDeleted: existing.IsDeleted,
                IsMonthOnly: existing.SourceExpenseItemId is null,
                CanUpdateDefault: existing.SourceExpenseItemId is not null));
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
