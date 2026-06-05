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

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.MarkPaidOff;

// Debt PR 4: source-lifecycle transition `active → paidOff`.
//
// Concretely this handler does up to three things in one transaction:
//
//   1. UPDATE Debt SET Status = 'paidOff', PaidOffAt = now, LifecycleReason = note?
//   2. UPDATE BudgetMonthDebt SET ParticipationStatus = 'notIncluded'
//      (the current month's payment stops counting; the row remains visible
//      in the editor / recap as a paid-off entry).
//   3. Optional: balance-to-zero. When `SetBalanceToZero == true`, reuses
//      the PR 3 balance-update path on each side that currently has a
//      non-zero balance, and writes one `DebtBalanceEvent` per side that
//      moved (scope = `currentMonthAndBudgetPlan`). The lifecycle audit
//      event records `balanceUpdated = true` so the recap can join the
//      two facts back together.
//
// Invariants:
//
//   * Source-link required. Month-only rows have no `Debt.Status` to flip;
//     the FE should redirect to the remove command for that intent.
//   * Already-paid sources return `AlreadyPaidOff` so confirmation modals
//     can disable the redundant action with a one-liner.
//   * The balance-to-zero step is independent of the lifecycle step. A
//     row with `Balance = 0` already gets no `DebtBalanceEvent` row even
//     when `SetBalanceToZero == true` — paying off a zero-balance debt is
//     a lifecycle decision, not a balance correction.
public sealed class MarkBudgetMonthDebtPaidOffCommandHandler
    : IRequestHandler<MarkBudgetMonthDebtPaidOffCommand, Result<BudgetMonthDebtLifecycleActionResponseDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IDebtBalanceEventRepository _balanceEvents;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public MarkBudgetMonthDebtPaidOffCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthDebtMutationRepository repo,
        IDebtBalanceEventRepository balanceEvents,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _balanceEvents = balanceEvents;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result<BudgetMonthDebtLifecycleActionResponseDto?>> Handle(
        MarkBudgetMonthDebtPaidOffCommand cmd,
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

        // Legacy `BudgetMonthDebt.Status = 'closed'` immutability guard.
        // Mirrors `DebtMutationGuard` / `DebtBalanceMutationGuard` / the
        // participation handler — every debt mutation path rejects closed
        // rows with the same precise code so the FE has one reason to react
        // to "this specific row is locked", separate from the month-level
        // `MonthIsClosed` check above.
        if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.RowClosed);

        if (existing.SourceDebtId is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.SourceLinkRequired);

        var source = await _repo.GetSourceDebtLifecycleAsync(existing.SourceDebtId.Value, ct);
        if (source is null)
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.SourcePlanNotFound);

        if (string.Equals(source.Status, DebtSourceLifecycleStatuses.PaidOff, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.AlreadyPaidOff);

        // Archived / deleted sources need an explicit restore first; this
        // mirrors the planned-payment guard so the FE sees one reason code
        // for "source is not in a state we can transition out of".
        if (!string.Equals(source.Status, DebtSourceLifecycleStatuses.Active, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthDebtLifecycleActionResponseDto?>.Failure(BudgetMonthDebtErrors.SourceLifecycleClosed);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var noteTrimmed = string.IsNullOrWhiteSpace(cmd.Note) ? null : cmd.Note.Trim();

        // (1) Source lifecycle. `ArchivedAt` / `DeletedAt` are preserved
        // from the snapshot so historical lifecycle facts survive.
        await _repo.UpdateBaselineDebtLifecycleAsync(
            new UpdateBaselineDebtLifecycleModel(
                DebtId: source.Id,
                Status: DebtSourceLifecycleStatuses.PaidOff,
                PaidOffAt: now,
                ArchivedAt: source.ArchivedAt,
                DeletedAt: source.DeletedAt,
                LifecycleReason: noteTrimmed,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        // (2) Month participation. Only flip if the row is currently
        // included — a `notIncluded` row stays where it is so the audit
        // doesn't claim a participation change that didn't happen.
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

        // (3) Optional balance-to-zero. Each side is evaluated
        // independently; a zero balance writes no event, mirroring the
        // PR 3 no-op contract. Scope is fixed at `currentMonthAndBudgetPlan`
        // because mark-paid-off conceptually drives both sides — even if
        // only one moved (the other was already zero).
        var monthBalanceMoved = false;
        var sourceBalanceMoved = false;
        decimal? oldMonthBalance = null;
        decimal? oldSourceBalance = null;

        if (cmd.SetBalanceToZero)
        {
            const string balanceScope = BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan;

            if (existing.Balance != 0m)
            {
                oldMonthBalance = existing.Balance;
                await _repo.UpdateMonthDebtBalanceAsync(
                    new UpdateBudgetMonthDebtBalanceModel(
                        Id: existing.Id,
                        BudgetMonthId: existing.BudgetMonthId,
                        Balance: 0m,
                        ActorPersoid: cmd.Persoid,
                        UtcNow: now),
                    ct);

                await _balanceEvents.InsertAsync(
                    new DebtBalanceEventWriteModel(
                        Id: Guid.NewGuid(),
                        BudgetId: source.BudgetId,
                        DebtId: null,
                        BudgetMonthDebtId: existing.Id,
                        BudgetMonthId: existing.BudgetMonthId,
                        OldBalance: existing.Balance,
                        NewBalance: 0m,
                        Delta: 0m - existing.Balance,
                        Scope: balanceScope,
                        Note: noteTrimmed,
                        ChangedByUserId: cmd.Persoid,
                        ChangedAt: now),
                    ct);
                monthBalanceMoved = true;
            }

            if (source.Balance != 0m)
            {
                oldSourceBalance = source.Balance;
                await _repo.UpdateBaselineDebtBalanceAsync(
                    new UpdateBaselineDebtBalanceModel(
                        DebtId: source.Id,
                        Balance: 0m,
                        ActorPersoid: cmd.Persoid,
                        UtcNow: now),
                    ct);

                await _balanceEvents.InsertAsync(
                    new DebtBalanceEventWriteModel(
                        Id: Guid.NewGuid(),
                        BudgetId: source.BudgetId,
                        DebtId: source.Id,
                        BudgetMonthDebtId: null,
                        BudgetMonthId: null,
                        OldBalance: source.Balance,
                        NewBalance: 0m,
                        Delta: 0m - source.Balance,
                        Scope: balanceScope,
                        Note: noteTrimmed,
                        ChangedByUserId: cmd.Persoid,
                        ChangedAt: now),
                    ct);
                sourceBalanceMoved = true;
            }
        }

        // Audit: one row capturing the lifecycle transition (and
        // cross-referencing the balance updates that fired in this
        // transaction). Balance-side detail still lives in the structured
        // DebtBalanceEvent rows above.
        var auditPayload = new
        {
            entity = "lifecycle",
            action = DebtLifecycleAuditActions.MarkPaidOff,
            monthDebtId = existing.Id,
            sourceDebtId = source.Id,
            before = new
            {
                SourceLifecycleStatus = source.Status,
                ParticipationStatus = existing.ParticipationStatus,
            },
            after = new
            {
                SourceLifecycleStatus = DebtSourceLifecycleStatuses.PaidOff,
                ParticipationStatus = participationChanged
                    ? BudgetMonthDebtParticipationStatuses.NotIncluded
                    : existing.ParticipationStatus,
            },
            balanceUpdated = monthBalanceMoved || sourceBalanceMoved,
            setBalanceToZeroRequested = cmd.SetBalanceToZero,
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
                Action: DebtLifecycleAuditActions.MarkPaidOff,
                PreviousParticipationStatus: existing.ParticipationStatus,
                ParticipationStatus: participationChanged
                    ? BudgetMonthDebtParticipationStatuses.NotIncluded
                    : existing.ParticipationStatus,
                PreviousSourceLifecycleStatus: source.Status,
                SourceLifecycleStatus: DebtSourceLifecycleStatuses.PaidOff,
                BalanceUpdated: monthBalanceMoved || sourceBalanceMoved,
                OldMonthBalance: oldMonthBalance,
                NewMonthBalance: monthBalanceMoved ? 0m : null,
                OldSourceBalance: oldSourceBalance,
                NewSourceBalance: sourceBalanceMoved ? 0m : null,
                MonthlyPayment: existing.MonthlyPayment,
                ChangedAt: now));
    }
}
