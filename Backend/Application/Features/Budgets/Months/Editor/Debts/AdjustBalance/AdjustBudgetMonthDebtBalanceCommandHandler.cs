using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;

// Debt PR 3: "Uppdatera saldo" — the only path through which a debt
// liability balance changes by hand. The handler is built around three
// invariants that PR 9 will rely on in the FE:
//
//   1. Planned monthly payment never moves here. The two columns
//      (`MonthlyPayment` and `Balance`) live on disjoint UPDATEs so the
//      planned-payment drawer's "saldo påverkas inte här" callout is true
//      in both directions.
//
//   2. Balance reaching zero is never an implicit paid-off. Source
//      lifecycle stays put; PR 4's `mark-paid-off` command is the only path
//      that flips `Debt.Status`. This handler will not even touch the
//      lifecycle columns.
//
//   3. Every real balance UPDATE writes a typed `DebtBalanceEvent` row
//      (old / new / delta / scope / note / actor / timestamp). Progress and
//      recap reads (PR 5 / PR 9) can scan that table without JSON parsing.
//      A `BudgetMonthChangeEvent` is *also* written when the month row
//      moves, so the month timeline still reflects that something happened
//      on the row — but the structured history lives in `DebtBalanceEvent`,
//      not in the JSON blob.
//
// No-op detection mirrors `DebtMutationApplier`: when the requested value
// equals the persisted value on a side, that side gets neither an UPDATE
// nor an event. Submitting the existing value must not flip `IsOverride`
// to 1 and must not create misleading history rows.
public sealed class AdjustBudgetMonthDebtBalanceCommandHandler
    : IRequestHandler<AdjustBudgetMonthDebtBalanceCommand, Result<AdjustBudgetMonthDebtBalanceResponseDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IDebtBalanceEventRepository _balanceEvents;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public AdjustBudgetMonthDebtBalanceCommandHandler(
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

    public async Task<Result<AdjustBudgetMonthDebtBalanceResponseDto?>> Handle(
        AdjustBudgetMonthDebtBalanceCommand cmd,
        CancellationToken ct)
    {
        // Defensive scope guard: an unsupported scope would otherwise fall
        // through both `WritesCurrentMonth` and `WritesBudgetPlan` as `false`,
        // returning a misleading "success / nothing updated" response when
        // the validator pipeline is bypassed. Mirrors the negative-balance
        // defense below — both validator and handler reject independently.
        if (!string.IsNullOrWhiteSpace(cmd.Scope) &&
            !BudgetMonthDebtEditScopes.IsSupported(cmd.Scope))
        {
            return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(
                BudgetMonthDebtErrors.ScopeUnsupported);
        }

        var scope = string.IsNullOrWhiteSpace(cmd.Scope)
            ? BudgetMonthDebtEditScopes.CurrentMonthOnly
            : cmd.Scope!;
        var writesCurrentMonth = BudgetMonthDebtEditScopes.WritesCurrentMonth(scope);
        var writesBudgetPlan = BudgetMonthDebtEditScopes.WritesBudgetPlan(scope);

        // Defensive re-check: the validator catches negative balances first,
        // but a missing or bypassed validator pipeline should still fail
        // before any UPDATE / INSERT runs (matches the SQL CHECK constraint
        // on `DebtBalanceEvent.NewBalance`).
        if (cmd.NewBalance < 0m)
            return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(
                BudgetMonthDebtErrors.BalanceNegative);

        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(ensured.Error!);

        // Owning `BudgetId` is required to write `DebtBalanceEvent.BudgetId`.
        // Reusing the PR 2 read here keeps the create / adjust paths on the
        // same query shape; the cost is one extra SELECT that resolves a
        // single GUID.
        var forCreate = await _repo.GetBudgetMonthForDebtCreateAsync(
            ensured.Value.BudgetMonthId,
            ct);

        if (forCreate is null)
            return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(BudgetMonth.NotFound);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(BudgetMonthDebtErrors.NotFound);

        if (!BudgetMonthEditability.IsEditable(monthMeta.Status))
            return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetDebtForMutationAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthDebtId,
            ct);

        if (existing is null)
            return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(BudgetMonthDebtErrors.NotFound);

        // Balance-specific guard: accepts `notIncluded` rows, rejects
        // removed / deleted / legacy-closed / month-only-with-plan-scope /
        // source-terminated-with-plan-scope. See `DebtBalanceMutationGuard`.
        var mutability = DebtBalanceMutationGuard.EnsureMutable(existing, writesBudgetPlan);
        if (mutability.IsFailure)
            return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(mutability.Error!);

        // Plan-side: snapshot the baseline balance before we touch it. The
        // month-side `existing.Balance` cannot stand in because the two
        // sides may have diverged through previous `currentMonthOnly`
        // adjustments. A null here means the linked source disappeared
        // between the read and now — defensive race guard.
        decimal? baselineBalanceBefore = null;
        if (writesBudgetPlan)
        {
            baselineBalanceBefore = await _repo.GetBaselineDebtBalanceAsync(
                existing.SourceDebtId!.Value,
                ct);

            if (baselineBalanceBefore is null)
                return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Failure(
                    BudgetMonthDebtErrors.SourcePlanNotFound);
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        // Per-side no-op detection. Each side is independent — a
        // `currentMonthAndBudgetPlan` adjustment may legitimately move only
        // one side when the other is already at the requested value.
        var monthBalanceChanged = writesCurrentMonth &&
            existing.Balance != cmd.NewBalance;

        var planBalanceChanged = writesBudgetPlan &&
            baselineBalanceBefore!.Value != cmd.NewBalance;

        var noteTrimmed = string.IsNullOrWhiteSpace(cmd.Note) ? null : cmd.Note.Trim();

        if (monthBalanceChanged)
        {
            await _repo.UpdateMonthDebtBalanceAsync(
                new UpdateBudgetMonthDebtBalanceModel(
                    Id: existing.Id,
                    BudgetMonthId: existing.BudgetMonthId,
                    Balance: cmd.NewBalance,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);

            // One typed history row per actual UPDATE. The month-side event
            // carries `BudgetMonthDebtId` and `BudgetMonthId`, but no
            // `DebtId` — even for source-linked rows — so a recap query
            // that wants "what happened on this month row" can filter cleanly
            // without picking up the sibling plan-side event.
            await _balanceEvents.InsertAsync(
                new DebtBalanceEventWriteModel(
                    Id: Guid.NewGuid(),
                    BudgetId: forCreate.BudgetId,
                    DebtId: null,
                    BudgetMonthDebtId: existing.Id,
                    BudgetMonthId: existing.BudgetMonthId,
                    OldBalance: existing.Balance,
                    NewBalance: cmd.NewBalance,
                    Delta: cmd.NewBalance - existing.Balance,
                    Scope: scope,
                    Note: noteTrimmed,
                    ChangedByUserId: cmd.Persoid,
                    ChangedAt: now),
                ct);
        }

        if (planBalanceChanged)
        {
            await _repo.UpdateBaselineDebtBalanceAsync(
                new UpdateBaselineDebtBalanceModel(
                    DebtId: existing.SourceDebtId!.Value,
                    Balance: cmd.NewBalance,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);

            // Plan-side event carries `DebtId` only — no month linkage.
            // "Progress for this debt across months" reads by `DebtId`;
            // "what happened to this month row" reads by
            // `BudgetMonthDebtId`. Keeping the two events disjoint avoids
            // double-counting when both queries are joined.
            await _balanceEvents.InsertAsync(
                new DebtBalanceEventWriteModel(
                    Id: Guid.NewGuid(),
                    BudgetId: forCreate.BudgetId,
                    DebtId: existing.SourceDebtId!.Value,
                    BudgetMonthDebtId: null,
                    BudgetMonthId: null,
                    OldBalance: baselineBalanceBefore!.Value,
                    NewBalance: cmd.NewBalance,
                    Delta: cmd.NewBalance - baselineBalanceBefore.Value,
                    Scope: scope,
                    Note: noteTrimmed,
                    ChangedByUserId: cmd.Persoid,
                    ChangedAt: now),
                ct);
        }

        // Month-side `BudgetMonthChangeEvent` only when the month row was
        // actually touched. The JSON carries `entity = "balance"` so a recap
        // consumer can tell this apart from a planned-payment edit on the
        // same row without parsing field names. The structured history still
        // lives in `DebtBalanceEvent`; this row is the audit timeline
        // breadcrumb, not the canonical balance history.
        if (monthBalanceChanged)
        {
            var changeSetJson = JsonSerializer.Serialize(new
            {
                entity = "balance",
                scope,
                currentMonthUpdated = monthBalanceChanged,
                baselineUpdated = planBalanceChanged,
                monthBefore = new { Balance = existing.Balance },
                monthAfter = new { Balance = cmd.NewBalance },
                sourceBefore = planBalanceChanged
                    ? new { Balance = baselineBalanceBefore!.Value }
                    : null,
                sourceAfter = planBalanceChanged
                    ? new { Balance = cmd.NewBalance }
                    : null,
                note = noteTrimmed
            });

            await _changeEvents.InsertAsync(
                new BudgetMonthChangeEventWriteModel(
                    Id: Guid.NewGuid(),
                    BudgetMonthId: ensured.Value.BudgetMonthId,
                    EntityType: BudgetAuditEntityTypes.Debt,
                    EntityId: existing.Id,
                    SourceEntityId: existing.SourceDebtId,
                    ChangeType: BudgetAuditChangeTypes.Updated,
                    ChangeSetJson: changeSetJson,
                    ChangedByUserId: cmd.Persoid,
                    ChangedAt: now),
                ct);
        }

        // Response composition: report each side independently so the FE
        // can render an honest delta and not infer "nothing happened" from
        // a zero delta. `MonthlyPayment` is echoed unchanged from
        // `existing` — this handler never touches it.
        var newMonthBalanceForResponse = monthBalanceChanged
            ? cmd.NewBalance
            : existing.Balance;
        var newSourceBalanceForResponse = planBalanceChanged
            ? cmd.NewBalance
            : baselineBalanceBefore;

        return Result<AdjustBudgetMonthDebtBalanceResponseDto?>.Success(
            new AdjustBudgetMonthDebtBalanceResponseDto(
                MonthDebtId: existing.Id,
                SourceDebtId: existing.SourceDebtId,
                Scope: scope,
                MonthBalanceUpdated: monthBalanceChanged,
                OldMonthBalance: writesCurrentMonth ? existing.Balance : null,
                NewMonthBalance: writesCurrentMonth ? newMonthBalanceForResponse : null,
                MonthDelta: writesCurrentMonth
                    ? newMonthBalanceForResponse - existing.Balance
                    : null,
                SourceBalanceUpdated: planBalanceChanged,
                OldSourceBalance: writesBudgetPlan ? baselineBalanceBefore : null,
                NewSourceBalance: writesBudgetPlan ? newSourceBalanceForResponse : null,
                SourceDelta: writesBudgetPlan && baselineBalanceBefore is not null
                    ? (newSourceBalanceForResponse ?? baselineBalanceBefore.Value)
                        - baselineBalanceBefore.Value
                    : null,
                MonthlyPayment: existing.MonthlyPayment,
                ChangedAt: now));
    }
}
