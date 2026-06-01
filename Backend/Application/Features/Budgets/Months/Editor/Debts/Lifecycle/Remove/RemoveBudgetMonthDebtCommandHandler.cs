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

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Remove;

// Debt PR 4: hide a month-only row from the editor and dashboard totals.
//
// Source-linked rows are rejected because removing a row that carried
// payment history would silently drop the history; archive (reversible,
// history-preserving) is the correct operation there. The handler returns
// `RemoveBlockedForSourceLinked` so the FE can swap the row's
// confirmation copy and CTA.
//
// The row is preserved in the database with
// `ParticipationStatus = 'removed'` and `IsDeleted = 1`; the editor's
// default read filters it out, so the user sees nothing — but recap /
// audit can still surface it.
public sealed class RemoveBudgetMonthDebtCommandHandler
    : IRequestHandler<RemoveBudgetMonthDebtCommand, Result<BudgetMonthDebtLifecycleActionResponseDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public RemoveBudgetMonthDebtCommandHandler(
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
        RemoveBudgetMonthDebtCommand cmd,
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

        // No-op idempotency: removing an already-removed row succeeds with
        // no audit, mirroring the planned-payment no-op contract. The
        // legacy `IsDeleted` flag is checked alongside the new vocabulary
        // because a row migrated from PR 0 might carry only the legacy
        // flag until the next write touches it.
        if (existing.IsDeleted ||
            string.Equals(
                existing.ParticipationStatus,
                BudgetMonthDebtParticipationStatuses.Removed,
                StringComparison.OrdinalIgnoreCase))
        {
            // Surface the existing state without writing; PR 8's confirm
            // dialog handles the "nothing to do" path by inspecting the
            // response.
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Success(
                BuildResponse(existing, BudgetMonthDebtParticipationStatuses.Removed, _timeProvider.GetUtcNow().UtcDateTime));
        }

        // Legacy `BudgetMonthDebt.Status = 'closed'` immutability guard.
        // Sits *after* the idempotent no-op exit so a closed-and-already-
        // removed row still no-ops (no harm), but a closed-not-removed row
        // is rejected loudly instead of silently falling through to the
        // source-link check below.
        if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.RowClosed);

        if (existing.SourceDebtId is not null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.RemoveBlockedForSourceLinked);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var noteTrimmed = string.IsNullOrWhiteSpace(cmd.Note) ? null : cmd.Note.Trim();

        await _repo.UpdateMonthDebtParticipationAsync(
            new UpdateBudgetMonthDebtParticipationModel(
                Id: existing.Id,
                BudgetMonthId: existing.BudgetMonthId,
                ParticipationStatus: BudgetMonthDebtParticipationStatuses.Removed,
                ParticipationReason: noteTrimmed,
                IsDeletedMirror: true,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        var auditPayload = new
        {
            entity = "remove",
            action = DebtLifecycleAuditActions.Remove,
            monthDebtId = existing.Id,
            sourceDebtId = (Guid?)null,
            before = new
            {
                ParticipationStatus = existing.ParticipationStatus,
                IsDeleted = existing.IsDeleted,
            },
            after = new
            {
                ParticipationStatus = BudgetMonthDebtParticipationStatuses.Removed,
                IsDeleted = true,
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
                SourceEntityId: null,
                ChangeType: BudgetAuditChangeTypes.Deleted,
                ChangeSetJson: JsonSerializer.Serialize(auditPayload),
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Success(
            BuildResponse(existing, BudgetMonthDebtParticipationStatuses.Removed, now));
    }

    private static BudgetMonthDebtLifecycleActionResponseDto BuildResponse(
        BudgetMonthDebtMutationReadModel existing,
        string newParticipation,
        DateTime changedAt) =>
        new(
            MonthDebtId: existing.Id,
            SourceDebtId: existing.SourceDebtId,
            Action: DebtLifecycleAuditActions.Remove,
            PreviousParticipationStatus: existing.ParticipationStatus,
            ParticipationStatus: newParticipation,
            PreviousSourceLifecycleStatus: existing.SourceLifecycleStatus,
            SourceLifecycleStatus: existing.SourceLifecycleStatus,
            BalanceUpdated: false,
            OldMonthBalance: null,
            NewMonthBalance: null,
            OldSourceBalance: null,
            NewSourceBalance: null,
            MonthlyPayment: existing.MonthlyPayment,
            ChangedAt: changedAt);
}
