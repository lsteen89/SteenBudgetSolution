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

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Archive;

// Debt PR 4: `active → archived` transition.
//
//   1. UPDATE Debt SET Status = 'archived', ArchivedAt = now, LifecycleReason = note?
//   2. Current open month's row → ParticipationStatus = notIncluded (if it
//      isn't already removed / notIncluded).
//   3. Audit: one `BudgetMonthChangeEvent` capturing both state moves.
//
// Balance is never touched. The only difference vs `MarkPaidOff` is the
// missing optional balance-to-zero branch — archive is fundamentally
// "I'm not going to deal with this right now," and a balance change would
// be a fact the user hasn't asserted.
public sealed class ArchiveBudgetMonthDebtCommandHandler
    : IRequestHandler<ArchiveBudgetMonthDebtCommand, Result<BudgetMonthDebtLifecycleActionResponseDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public ArchiveBudgetMonthDebtCommandHandler(
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
        ArchiveBudgetMonthDebtCommand cmd,
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

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetDebtForMutationAsync(budgetMonthId, cmd.MonthDebtId, ct);
        if (existing is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.NotFound);

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

        // Legacy `BudgetMonthDebt.Status = 'closed'` immutability guard —
        // see MarkPaidOff handler for rationale.
        if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.RowClosed);

        if (existing.SourceDebtId is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.SourceLinkRequired);

        var source = await _repo.GetSourceDebtLifecycleAsync(existing.SourceDebtId.Value, ct);
        if (source is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.SourcePlanNotFound);

        if (string.Equals(source.Status, DebtSourceLifecycleStatuses.Archived, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.AlreadyArchived);

        if (string.Equals(source.Status, DebtSourceLifecycleStatuses.PaidOff, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.AlreadyPaidOff);

        if (!string.Equals(source.Status, DebtSourceLifecycleStatuses.Active, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.SourceLifecycleClosed);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var noteTrimmed = string.IsNullOrWhiteSpace(cmd.Note) ? null : cmd.Note.Trim();

        await _repo.UpdateBaselineDebtLifecycleAsync(
            new UpdateBaselineDebtLifecycleModel(
                DebtId: source.Id,
                Status: DebtSourceLifecycleStatuses.Archived,
                PaidOffAt: source.PaidOffAt,
                ArchivedAt: now,
                DeletedAt: source.DeletedAt,
                LifecycleReason: noteTrimmed,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        var participationChanged = false;
        if (string.Equals(
                existing.ParticipationStatus,
                BudgetMonthDebtParticipationStatuses.Included,
                StringComparison.OrdinalIgnoreCase))
        {
            await _repo.UpdateMonthDebtParticipationAsync(
                new UpdateBudgetMonthDebtParticipationModel(
                    Id: existing.Id,
                    BudgetMonthId: existing.BudgetMonthId,
                    ParticipationStatus: BudgetMonthDebtParticipationStatuses.NotIncluded,
                    ParticipationReason: noteTrimmed,
                    IsDeletedMirror: false,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
            participationChanged = true;
        }

        var auditPayload = new
        {
            entity = "lifecycle",
            action = DebtLifecycleAuditActions.Archive,
            monthDebtId = existing.Id,
            sourceDebtId = source.Id,
            before = new
            {
                SourceLifecycleStatus = source.Status,
                ParticipationStatus = existing.ParticipationStatus,
            },
            after = new
            {
                SourceLifecycleStatus = DebtSourceLifecycleStatuses.Archived,
                ParticipationStatus = participationChanged
                    ? BudgetMonthDebtParticipationStatuses.NotIncluded
                    : existing.ParticipationStatus,
            },
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
                Action: DebtLifecycleAuditActions.Archive,
                PreviousParticipationStatus: existing.ParticipationStatus,
                ParticipationStatus: participationChanged
                    ? BudgetMonthDebtParticipationStatuses.NotIncluded
                    : existing.ParticipationStatus,
                PreviousSourceLifecycleStatus: source.Status,
                SourceLifecycleStatus: DebtSourceLifecycleStatuses.Archived,
                BalanceUpdated: false,
                OldMonthBalance: null,
                NewMonthBalance: null,
                OldSourceBalance: null,
                NewSourceBalance: null,
                MonthlyPayment: existing.MonthlyPayment,
                ChangedAt: now));
    }
}
