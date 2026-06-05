using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Participation;

// Debt PR 4: skip / include this month.
//
// Invariants this handler protects:
//
//   1. Planned payment is never written. The "Ingår inte denna månad"
//      header in PR 6/8 must be truthful — a skipped row shows the same
//      planned amount as before, the dashboard total just excludes it.
//
//   2. Balance is never written. A skipped debt is still owed; PR 3's
//      balance flow is the only path that updates `BudgetMonthDebt.Balance`.
//
//   3. Source lifecycle is never touched. Skip / include is per-month
//      participation, not a source-lifecycle decision. Archive and
//      mark-paid-off are the only commands that flip `Debt.Status`.
//
//   4. Submitting the row's current participation is rejected with
//      `ParticipationUnchanged` — the FE can distinguish "nothing to do"
//      from a real change without parsing the response.
public sealed class SetBudgetMonthDebtParticipationCommandHandler
    : IRequestHandler<SetBudgetMonthDebtParticipationCommand, Result<BudgetMonthDebtLifecycleActionResponseDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public SetBudgetMonthDebtParticipationCommandHandler(
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
        SetBudgetMonthDebtParticipationCommand cmd,
        CancellationToken ct)
    {
        // Defensive re-check (validator catches this first). `removed` is
        // explicitly rejected here, not in the validator's positive-list,
        // because the validator uses the same constants — adding `Removed`
        // there would silently accept it. The remove command is the only
        // path to that state.
        if (cmd.Participation != BudgetMonthDebtParticipationStatuses.Included &&
            cmd.Participation != BudgetMonthDebtParticipationStatuses.NotIncluded)
        {
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.ParticipationUnsupported);
        }

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

        // Removed / legacy-deleted rows can't be toggled — they need to be
        // restored first (out of scope for PR 4) or replaced via add.
        if (string.Equals(
                existing.ParticipationStatus,
                BudgetMonthDebtParticipationStatuses.Removed,
                StringComparison.OrdinalIgnoreCase))
        {
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.RowRemoved);
        }

        if (existing.IsDeleted)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.RowDeleted);

        if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.RowClosed);

        // A non-active source can't be re-included for this month — the FE
        // must restore the source first. We do allow moving an already-
        // notIncluded source-terminated row back to `notIncluded` no-op
        // (rare), so the `ParticipationUnchanged` check below catches it.
        if (cmd.Participation == BudgetMonthDebtParticipationStatuses.Included &&
            existing.SourceDebtId is not null &&
            existing.SourceLifecycleStatus is not null &&
            !string.Equals(
                existing.SourceLifecycleStatus,
                DebtSourceLifecycleStatuses.Active,
                StringComparison.OrdinalIgnoreCase))
        {
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.SourceLifecycleClosed);
        }

        if (string.Equals(
                existing.ParticipationStatus,
                cmd.Participation,
                StringComparison.OrdinalIgnoreCase))
        {
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(
                BudgetMonthDebtErrors.ParticipationUnchanged);
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var noteTrimmed = string.IsNullOrWhiteSpace(cmd.Note) ? null : cmd.Note.Trim();

        await _repo.UpdateMonthDebtParticipationAsync(
            new UpdateBudgetMonthDebtParticipationModel(
                Id: existing.Id,
                BudgetMonthId: existing.BudgetMonthId,
                ParticipationStatus: cmd.Participation,
                ParticipationReason: noteTrimmed,
                // include / notIncluded both keep the row visible — IsDeleted
                // stays in sync with the participation vocabulary.
                IsDeletedMirror: false,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        var auditPayload = new
        {
            entity = "participation",
            action = DebtLifecycleAuditActions.SetParticipation,
            monthDebtId = existing.Id,
            sourceDebtId = existing.SourceDebtId,
            before = new { ParticipationStatus = existing.ParticipationStatus },
            after = new { ParticipationStatus = cmd.Participation },
            // Payment and balance are echoed read-only so an audit reader
            // can confirm the invariants held — they must equal each other.
            monthlyPayment = existing.MonthlyPayment,
            balance = existing.Balance,
            note = noteTrimmed,
        };

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: budgetMonthId,
                EntityType: BudgetAuditEntityTypes.Debt,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceDebtId,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: JsonSerializer.Serialize(auditPayload),
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Success(
            new BudgetMonthDebtLifecycleActionResponseDto(
                MonthDebtId: existing.Id,
                SourceDebtId: existing.SourceDebtId,
                Action: DebtLifecycleAuditActions.SetParticipation,
                PreviousParticipationStatus: existing.ParticipationStatus,
                ParticipationStatus: cmd.Participation,
                PreviousSourceLifecycleStatus: existing.SourceLifecycleStatus,
                SourceLifecycleStatus: existing.SourceLifecycleStatus,
                BalanceUpdated: false,
                OldMonthBalance: null,
                NewMonthBalance: null,
                OldSourceBalance: null,
                NewSourceBalance: null,
                MonthlyPayment: existing.MonthlyPayment,
                ChangedAt: now));
    }
}
