using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Income;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;

public sealed class CreateBudgetMonthIncomeItemCommandHandler
    : IRequestHandler<CreateBudgetMonthIncomeItemCommand, Result<BudgetMonthIncomeItemEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthIncomeItemMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public CreateBudgetMonthIncomeItemCommandHandler(
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

    public async Task<Result<BudgetMonthIncomeItemEditorRowDto?>> Handle(
        CreateBudgetMonthIncomeItemCommand cmd,
        CancellationToken ct)
    {
        if (!BudgetMonthIncomeItemKinds.IsSupportedCreateKind(cmd.Kind))
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonthIncomeItemErrors.InvalidKind);

        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonth.NotFound);

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var budgetMonthIncomeId = await _repo.GetBudgetMonthIncomeIdAsync(ensured.Value.BudgetMonthId, ct);
        if (budgetMonthIncomeId is null)
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonthIncomeItemErrors.NotFound);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var id = Guid.NewGuid();
        var trimmedName = cmd.Name.Trim();

        await _repo.InsertMonthIncomeItemAsync(
            new InsertBudgetMonthIncomeItemModel(
                Id: id,
                BudgetMonthIncomeId: budgetMonthIncomeId.Value,
                Kind: cmd.Kind,
                SourceIncomeItemId: null,
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
                Kind = cmd.Kind,
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
                EntityType: BudgetAuditEntityTypes.IncomeItem,
                EntityId: id,
                SourceEntityId: null,
                ChangeType: BudgetAuditChangeTypes.Created,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthIncomeItemEditorRowDto?>.Success(
            new BudgetMonthIncomeItemEditorRowDto(
                Id: id,
                SourceIncomeItemId: null,
                Kind: cmd.Kind,
                Name: trimmedName,
                AmountMonthly: cmd.AmountMonthly,
                IsActive: cmd.IsActive,
                IsDeleted: false,
                IsMonthOnly: true,
                CanUpdateDefault: false));
    }
}

