using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;

public sealed class CreateBudgetMonthSavingsGoalCommandHandler
    : IRequestHandler<CreateBudgetMonthSavingsGoalCommand, Result<BudgetMonthSavingsGoalEditorRowDto?>>
{
    private const string ActiveStatus = "active";

    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public CreateBudgetMonthSavingsGoalCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result<BudgetMonthSavingsGoalEditorRowDto?>> Handle(
        CreateBudgetMonthSavingsGoalCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonth.NotFound);

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var monthSavings = await _repo.GetBudgetMonthSavingsForCreateAsync(ensured.Value.BudgetMonthId, ct);
        if (monthSavings is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonthSavingsGoalErrors.NotFound);

        if (monthSavings.SourceSavingsId is null)
            return Result<BudgetMonthSavingsGoalEditorRowDto?>.Failure(BudgetMonthSavingsGoalErrors.SavingsPlanMissing);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var trimmedName = cmd.Name.Trim();
        var amountSaved = cmd.AmountSaved ?? 0m;
        var targetDate = cmd.TargetDate?.ToDateTime(TimeOnly.MinValue);

        var baselineGoalId = Guid.NewGuid();
        var monthGoalId = Guid.NewGuid();

        await _repo.InsertBaselineSavingsGoalAsync(
            new InsertBaselineSavingsGoalModel(
                Id: baselineGoalId,
                SavingsId: monthSavings.SourceSavingsId.Value,
                Name: trimmedName,
                TargetAmount: cmd.TargetAmount,
                TargetDate: targetDate,
                AmountSaved: amountSaved,
                MonthlyContribution: cmd.MonthlyContribution,
                Status: ActiveStatus,
                OpenedAt: now,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        await _repo.InsertMonthSavingsGoalAsync(
            new InsertBudgetMonthSavingsGoalModel(
                Id: monthGoalId,
                BudgetMonthSavingsId: monthSavings.BudgetMonthSavingsId,
                SourceSavingsGoalId: baselineGoalId,
                Name: trimmedName,
                TargetAmount: cmd.TargetAmount,
                TargetDate: targetDate,
                AmountSaved: amountSaved,
                MonthlyContribution: cmd.MonthlyContribution,
                Status: ActiveStatus,
                OpenedAt: now,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        var changeSetJson = JsonSerializer.Serialize(new
        {
            createdEntity = new
            {
                Id = monthGoalId,
                SourceSavingsGoalId = baselineGoalId,
                Name = trimmedName,
                TargetAmount = cmd.TargetAmount,
                TargetDate = targetDate,
                AmountSaved = amountSaved,
                MonthlyContribution = cmd.MonthlyContribution,
                Status = ActiveStatus
            }
        });

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: ensured.Value.BudgetMonthId,
                EntityType: BudgetAuditEntityTypes.SavingsGoal,
                EntityId: monthGoalId,
                SourceEntityId: baselineGoalId,
                ChangeType: BudgetAuditChangeTypes.Created,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthSavingsGoalEditorRowDto?>.Success(
            new BudgetMonthSavingsGoalEditorRowDto(
                Id: monthGoalId,
                SourceSavingsGoalId: baselineGoalId,
                Name: trimmedName,
                TargetAmount: cmd.TargetAmount,
                TargetDate: targetDate,
                AmountSaved: amountSaved,
                MonthlyContribution: cmd.MonthlyContribution,
                Status: ActiveStatus,
                ClosedReason: null,
                ClosedAt: null,
                IsDeleted: false,
                IsMonthOnly: false,
                CanUpdateDefault: true));
    }
}
