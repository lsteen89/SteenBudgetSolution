using System.Text.Json;
using Backend.Domain.Shared;
using MediatR;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Domain.Errors.Budget;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Expense;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem;

public sealed class CreateBudgetMonthExpenseItemCommandHandler
    : IRequestHandler<CreateBudgetMonthExpenseItemCommand, Result<BudgetMonthExpenseItemEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthExpenseItemMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public CreateBudgetMonthExpenseItemCommandHandler(
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
        CreateBudgetMonthExpenseItemCommand cmd,
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
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(BudgetMonth.NotFound);

        if (!string.Equals(monthMeta.Status, "open", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var categoryExists = await _repo.ExpenseCategoryExistsAsync(cmd.CategoryId, ct);
        if (!categoryExists)
            return Result<BudgetMonthExpenseItemEditorRowDto?>.Failure(BudgetMonthExpenseItemErrors.InvalidCategory);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var id = Guid.NewGuid();
        var trimmedName = cmd.Name.Trim();

        await _repo.InsertMonthExpenseItemAsync(
            new InsertBudgetMonthExpenseItemModel(
                Id: id,
                BudgetMonthId: ensured.Value.BudgetMonthId,
                SourceExpenseItemId: null,
                CategoryId: cmd.CategoryId,
                Name: trimmedName,
                AmountMonthly: cmd.AmountMonthly,
                IsActive: cmd.IsActive,
                IsDeleted: false,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        var changeSetJson = JsonSerializer.Serialize(new
        {
            createdEntity = new
            {
                Id = id,
                CategoryId = cmd.CategoryId,
                Name = trimmedName,
                AmountMonthly = cmd.AmountMonthly,
                IsActive = cmd.IsActive,
                IsMonthOnly = true
            }
        });

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: ensured.Value.BudgetMonthId,
                EntityType: "expense-item",
                EntityId: id,
                SourceEntityId: null,
                ChangeType: "created",
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthExpenseItemEditorRowDto?>.Success(
            new BudgetMonthExpenseItemEditorRowDto(
                Id: id,
                SourceExpenseItemId: null,
                CategoryId: cmd.CategoryId,
                Name: trimmedName,
                AmountMonthly: cmd.AmountMonthly,
                IsActive: cmd.IsActive,
                IsDeleted: false,
                IsMonthOnly: true,
                CanUpdateDefault: false));
    }
}