using System.Text.Json;
using Backend.Domain.Shared;
using MediatR;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Audit;
using Backend.Domain.Errors.Budget;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.DeleteExpenseItem;

public sealed class DeleteBudgetMonthExpenseItemCommandHandler
    : IRequestHandler<DeleteBudgetMonthExpenseItemCommand, Result>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthExpenseItemMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public DeleteBudgetMonthExpenseItemCommandHandler(
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

    public async Task<Result> Handle(
        DeleteBudgetMonthExpenseItemCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result.Failure(BudgetMonth.NotFound);

        if (!string.Equals(monthMeta.Status, "open", StringComparison.OrdinalIgnoreCase))
            return Result.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetExpenseItemForMutationAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthExpenseItemId,
            ct);

        if (existing is null)
            return Result.Failure(BudgetMonthExpenseItemErrors.NotFound);

        if (existing.IsDeleted)
            return Result.Success();

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        var deleted = await _repo.SoftDeleteMonthExpenseItemAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthExpenseItemId,
            cmd.Persoid,
            now,
            ct);

        if (!deleted)
            return Result.Failure(BudgetMonthExpenseItemErrors.NotFound);

        var changeSetJson = JsonSerializer.Serialize(new
        {
            deletedEntity = new
            {
                existing.Id,
                existing.SourceExpenseItemId,
                existing.Name,
                existing.CategoryId,
                existing.AmountMonthly,
                existing.IsActive
            },
            flags = new
            {
                isDeleted = new
                {
                    oldValue = false,
                    newValue = true
                }
            }
        });

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: ensured.Value.BudgetMonthId,
                EntityType: BudgetAuditEntityTypes.ExpenseItem,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceExpenseItemId,
                ChangeType: BudgetAuditChangeTypes.Deleted,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result.Success();
    }
}
