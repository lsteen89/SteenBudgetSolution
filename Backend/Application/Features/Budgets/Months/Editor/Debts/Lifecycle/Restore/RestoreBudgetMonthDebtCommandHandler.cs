using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Restore;

// Debt PR 4: `archived → active` transition.
//
// Two facts move:
//
//   1. UPDATE Debt SET Status = 'active', ArchivedAt = NULL, LifecycleReason = note?
//      `PaidOffAt` / `DeletedAt` are preserved — restoring from archive
//      does not pretend the row was never paid off in some prior life.
//
//   2. (Opt-in) UPDATE BudgetMonthDebt SET ParticipationStatus = 'included'
//      for the current open month's row, when `ReIncludeCurrentMonth = true`
//      and the row currently sits at `notIncluded` (the typical state
//      Archive leaves it in). Closed / skipped months are untouched by
//      definition — `EnsureAccessibleMonthAsync` already guards that.
//
// Restore is deliberately conservative: it never *creates* a new month row,
// only re-includes the existing one. If the user is several months past the
// archive point, the materializer will (correctly) start emitting fresh
// rows from the next opened budget month.
public sealed class RestoreBudgetMonthDebtCommandHandler
    : IRequestHandler<RestoreBudgetMonthDebtCommand, Result<BudgetMonthDebtLifecycleActionResponseDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public RestoreBudgetMonthDebtCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthDebtMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result<BudgetMonthDebtLifecycleActionResponseDto?>> Handle(
        RestoreBudgetMonthDebtCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(ensured.Error!);

        var budgetMonthId = ensured.Value.BudgetMonthId;
        var monthMeta = await _repo.GetBudgetMonthMetaAsync(budgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.NotFound);

        if (!BudgetMonthEditability.IsEditable(monthMeta.Status))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetDebtForMutationAsync(budgetMonthId, cmd.MonthDebtId, ct);
        if (existing is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.NotFound);

        // Row-level immutability guards. Restore is reachable only from the
        // Arkiverad UI group where rows normally sit at
        // `participation = notIncluded`; a `removed` / `IsDeleted` / legacy
        // `Status='closed'` row should never reach this command, but we
        // surface the same precise codes as the rest of the debt mutation
        // paths so the FE doesn't need a separate "unexpected restore
        // state" code path.
        if (string.Equals(
                existing.ParticipationStatus,
                BudgetMonthDebtParticipationStatuses.Removed,
                StringComparison.OrdinalIgnoreCase))
        {
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.RowRemoved);
        }

        if (existing.IsDeleted)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.RowDeleted);

        if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.RowClosed);

        if (existing.SourceDebtId is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.SourceLinkRequired);

        var source = await _repo.GetSourceDebtLifecycleAsync(existing.SourceDebtId.Value, ct);
        if (source is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.SourcePlanNotFound);

        // Only archived sources can be restored in PR 4. A `paidOff` source
        // would need its own un-paid command (re-opens balance history),
        // and a `deleted` source needs its own un-delete path. Keep the
        // surface area small and well-defined.
        if (!string.Equals(source.Status, DebtSourceLifecycleStatuses.Archived, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.NotArchived);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var noteTrimmed = string.IsNullOrWhiteSpace(cmd.Note) ? null : cmd.Note.Trim();

        await _repo.UpdateBaselineDebtLifecycleAsync(
            new UpdateBaselineDebtLifecycleModel(
                DebtId: source.Id,
                Status: DebtSourceLifecycleStatuses.Active,
                // `ArchivedAt` clears so the FE can read "current lifecycle"
                // straight from `Status` without reconciling timestamps.
                // The audit row below preserves the fact that this row
                // *was* archived at a particular moment.
                PaidOffAt: source.PaidOffAt,
                ArchivedAt: null,
                DeletedAt: source.DeletedAt,
                LifecycleReason: noteTrimmed,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        // Opt-in re-include. We never auto-include a row that the user
        // hasn't explicitly asked for, so the participation state must be
        // `notIncluded` AND the caller must have requested it. Rows that
        // are already `included` (rare; would mean the user pre-toggled
        // before restoring) are left alone, mirroring the no-op contract.
        var participationChanged = false;
        var nextParticipation = existing.ParticipationStatus;

        if (cmd.ReIncludeCurrentMonth &&
            string.Equals(
                existing.ParticipationStatus,
                BudgetMonthDebtParticipationStatuses.NotIncluded,
                StringComparison.OrdinalIgnoreCase))
        {
            await _repo.UpdateMonthDebtParticipationAsync(
                new UpdateBudgetMonthDebtParticipationModel(
                    Id: existing.Id,
                    BudgetMonthId: existing.BudgetMonthId,
                    ParticipationStatus: BudgetMonthDebtParticipationStatuses.Included,
                    ParticipationReason: noteTrimmed,
                    IsDeletedMirror: false,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
            participationChanged = true;
            nextParticipation = BudgetMonthDebtParticipationStatuses.Included;
        }

        var auditPayload = new
        {
            entity = "lifecycle",
            action = DebtLifecycleAuditActions.Restore,
            monthDebtId = existing.Id,
            sourceDebtId = source.Id,
            before = new
            {
                SourceLifecycleStatus = source.Status,
                ParticipationStatus = existing.ParticipationStatus,
            },
            after = new
            {
                SourceLifecycleStatus = DebtSourceLifecycleStatuses.Active,
                ParticipationStatus = nextParticipation,
            },
            reIncludeCurrentMonthRequested = cmd.ReIncludeCurrentMonth,
            participationChanged = participationChanged,
            balanceUpdated = false,
            note = noteTrimmed,
        };

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: budgetMonthId,
                EntityType: BudgetAuditEntityTypes.Debt,
                EntityId: existing.Id,
                SourceEntityId: source.Id,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: JsonSerializer.Serialize(auditPayload),
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Success(
            new BudgetMonthDebtLifecycleActionResponseDto(
                MonthDebtId: existing.Id,
                SourceDebtId: source.Id,
                Action: DebtLifecycleAuditActions.Restore,
                PreviousParticipationStatus: existing.ParticipationStatus,
                ParticipationStatus: nextParticipation,
                PreviousSourceLifecycleStatus: source.Status,
                SourceLifecycleStatus: DebtSourceLifecycleStatuses.Active,
                BalanceUpdated: false,
                OldMonthBalance: null,
                NewMonthBalance: null,
                OldSourceBalance: null,
                NewSourceBalance: null,
                MonthlyPayment: existing.MonthlyPayment,
                ChangedAt: now));
    }
}
