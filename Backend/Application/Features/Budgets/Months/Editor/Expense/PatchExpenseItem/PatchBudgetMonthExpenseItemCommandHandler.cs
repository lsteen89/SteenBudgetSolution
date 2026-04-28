using System.Text.Json;
using Backend.Domain.Shared;
using MediatR;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
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
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        if (cmd.UpdateDefault)
        {
            if (existing.SourceExpenseItemId is null)
                return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(
                    BudgetMonthExpenseItemErrors.CannotUpdateDefaultForMonthOnlyRow);

            var baselineExists = await _repo.BaselineExpenseItemExistsAsync(existing.SourceExpenseItemId.Value, ct);
            if (!baselineExists)
                return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(
                    BudgetMonthExpenseItemErrors.SourceDefaultNotFound);
        }

        await _repo.UpdateMonthExpenseItemAsync(
            new UpdateBudgetMonthExpenseItemModel(
                Id: existing.Id,
                BudgetMonthId: ensured.Value.BudgetMonthId,
                CategoryId: mergedCategoryId,
                Name: mergedName,
                AmountMonthly: mergedAmountMonthly,
                IsActive: mergedIsActive,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        var baselineUpdated = false;

        if (cmd.UpdateDefault)
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
                existing.IsActive
            },
            after = new
            {
                Name = mergedName,
                CategoryId = mergedCategoryId,
                AmountMonthly = mergedAmountMonthly,
                IsActive = mergedIsActive
            },
            cmd.UpdateDefault,
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
                CategoryId: mergedCategoryId,
                Name: mergedName,
                AmountMonthly: mergedAmountMonthly,
                IsActive: mergedIsActive,
                IsDeleted: existing.IsDeleted,
                IsMonthOnly: existing.SourceExpenseItemId is null,
                CanUpdateDefault: existing.SourceExpenseItemId is not null));
    }
}
