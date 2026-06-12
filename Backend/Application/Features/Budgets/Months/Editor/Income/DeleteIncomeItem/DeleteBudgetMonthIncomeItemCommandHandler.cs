using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.DeleteIncomeItem;

public sealed class DeleteBudgetMonthIncomeItemCommandHandler
    : IRequestHandler<DeleteBudgetMonthIncomeItemCommand, Result>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthIncomeItemMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public DeleteBudgetMonthIncomeItemCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthIncomeItemMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result> Handle(DeleteBudgetMonthIncomeItemCommand cmd, CancellationToken ct)
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

        if (!BudgetMonthEditability.IsEditable(monthMeta.Status))
            return Result.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetIncomeItemForMutationAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthIncomeItemId,
            ct);

        if (existing is null)
            return Result.Failure(BudgetMonthIncomeItemErrors.NotFound);

        if (existing.Kind == BudgetMonthIncomeItemKinds.Salary)
            return Result.Failure(BudgetMonthIncomeItemErrors.SalaryCannotBeDeleted);

        if (existing.IsDeleted)
            return Result.Success();

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var deleted = await _repo.SoftDeleteMonthIncomeItemAsync(
            existing.BudgetMonthIncomeId,
            existing.Id,
            existing.Kind,
            cmd.Persoid,
            now,
            ct);

        if (!deleted)
            return Result.Failure(BudgetMonthIncomeItemErrors.NotFound);

        var changeSetJson = JsonSerializer.Serialize(new
        {
            deletedEntity = new
            {
                existing.Id,
                existing.SourceIncomeItemId,
                existing.Kind,
                existing.Name,
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
                EntityType: BudgetAuditEntityTypes.IncomeItem,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceIncomeItemId,
                ChangeType: BudgetAuditChangeTypes.Deleted,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result.Success();
    }
}
