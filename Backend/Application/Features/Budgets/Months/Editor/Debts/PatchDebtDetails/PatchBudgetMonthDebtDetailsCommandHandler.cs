using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtDetails;

// Debt PR 2: edit the full metadata surface of a debt (Name, Type, Apr,
// MonthlyFee, MinPayment, TermMonths, MonthlyPayment).
//
// Distinct from the planned-payment-only patch in `PatchDebt`. That endpoint
// stays as the lighter "edit planned payment" drawer; this one is the
// "redigera uppgifter" drawer in the editor.
//
// Balance is intentionally not touched here — the balance liability snapshot
// is owned by PR 3's `Uppdatera saldo` command so that liability changes are
// auditable and visibly separate from a planned-payment edit.
//
// Pre-flight goes through the shared `DebtMutationGuard` so this handler and
// the planned-payment patch handler cannot drift on which lifecycle /
// participation states reject mutation. PR 2 spec explicitly requires
// "archived / paidOff / deleted / removed rows rejected for detail edits"
// — `DebtMutationGuard.EnsureMutable` returns the precise reason for each
// of those.
public sealed class PatchBudgetMonthDebtDetailsCommandHandler
    : IRequestHandler<PatchBudgetMonthDebtDetailsCommand, Result<BudgetMonthDebtEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthDebtDetailsCommandHandler(
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

    public async Task<Result<BudgetMonthDebtEditorRowDto?>> Handle(
        PatchBudgetMonthDebtDetailsCommand cmd,
        CancellationToken ct)
    {
        var scope = string.IsNullOrWhiteSpace(cmd.Scope)
            ? BudgetMonthDebtEditScopes.CurrentMonthOnly
            : cmd.Scope!;
        var writesCurrentMonth = BudgetMonthDebtEditScopes.WritesCurrentMonth(scope);
        var writesBudgetPlan = BudgetMonthDebtEditScopes.WritesBudgetPlan(scope);

        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(BudgetMonthDebtErrors.NotFound);

        if (!BudgetMonthEditability.IsEditable(monthMeta.Status))
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetDebtForMutationAsync(
            ensured.Value.BudgetMonthId,
            cmd.MonthDebtId,
            ct);

        if (existing is null)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(BudgetMonthDebtErrors.NotFound);

        // Shared with the planned-payment patch so the two paths reject the
        // same invalid lifecycle / participation states.
        var mutability = DebtMutationGuard.EnsureMutable(existing);
        if (mutability.IsFailure)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(mutability.Error!);

        // The shared guard only rejects month-only + plan-writing when the
        // source actually exists in a closed lifecycle state. A month-only
        // row (`SourceDebtId` is null) sails past that branch entirely, so
        // the explicit "cannot update plan for a row without a plan side"
        // check has to live here — mirroring the planned-payment applier's
        // identical guard.
        if (writesBudgetPlan && existing.SourceDebtId is null)
            return Result<BudgetMonthDebtEditorRowDto?>.Failure(
                BudgetMonthDebtErrors.CannotUpdatePlanForMonthOnlyRow);

        // Plan-writing detail patches need the baseline snapshot for two
        // reasons:
        //   1. Honest `sourceValuesBefore` in audit JSON — the month row
        //      values may have diverged via earlier currentMonthOnly edits,
        //      so they cannot stand in for the plan row's true before-state.
        //   2. Defensive existence check against a race where the row exists
        //      but the linked source was deleted in another transaction.
        BudgetMonthDebtBaselineSnapshotReadModel? baselineBefore = null;
        if (writesBudgetPlan)
        {
            baselineBefore = await _repo.GetBaselineDebtSnapshotAsync(
                existing.SourceDebtId!.Value,
                ct);

            if (baselineBefore is null)
                return Result<BudgetMonthDebtEditorRowDto?>.Failure(
                    BudgetMonthDebtErrors.SourcePlanNotFound);
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var trimmedName = cmd.Name.Trim();

        // No-op detection mirrors `DebtMutationApplier` (the planned-payment
        // path): when the requested values match the row's current persisted
        // values, no UPDATE and no audit event are written. This keeps the
        // detail handler honest — submitting unchanged values must not move
        // `UpdatedAt`, must not flip `IsOverride` to 1, and must not create
        // a misleading "updated" entry in `BudgetMonthChangeEvent`.
        //
        // Month side compared against `existing` (the month row); source side
        // compared against `baselineBefore` (the plan row), which is only
        // fetched when the scope writes the plan. Each side is independent —
        // `currentMonthAndBudgetPlan` may legitimately mutate only one side
        // when the month row has previously diverged from the plan.
        var monthDetailsChanged = writesCurrentMonth && (
            !string.Equals(existing.Name ?? string.Empty, trimmedName, StringComparison.Ordinal) ||
            !string.Equals(existing.Type, cmd.Type, StringComparison.Ordinal) ||
            existing.Apr != cmd.Apr ||
            existing.MonthlyFee != cmd.MonthlyFee ||
            existing.MinPayment != cmd.MinPayment ||
            existing.TermMonths != cmd.TermMonths ||
            existing.MonthlyPayment != cmd.MonthlyPayment);

        var sourceDetailsChanged = writesBudgetPlan && baselineBefore is not null && (
            !string.Equals(baselineBefore.Name, trimmedName, StringComparison.Ordinal) ||
            !string.Equals(baselineBefore.Type, cmd.Type, StringComparison.Ordinal) ||
            baselineBefore.Apr != cmd.Apr ||
            baselineBefore.MonthlyFee != cmd.MonthlyFee ||
            baselineBefore.MinPayment != cmd.MinPayment ||
            baselineBefore.TermMonths != cmd.TermMonths ||
            baselineBefore.MonthlyPayment != cmd.MonthlyPayment);

        if (monthDetailsChanged)
        {
            await _repo.UpdateMonthDebtDetailsAsync(
                new UpdateBudgetMonthDebtDetailsModel(
                    Id: existing.Id,
                    BudgetMonthId: existing.BudgetMonthId,
                    Name: trimmedName,
                    Type: cmd.Type,
                    Apr: cmd.Apr,
                    MonthlyFee: cmd.MonthlyFee,
                    MinPayment: cmd.MinPayment,
                    TermMonths: cmd.TermMonths,
                    MonthlyPayment: cmd.MonthlyPayment,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
        }

        if (sourceDetailsChanged)
        {
            await _repo.UpdateBaselineDebtDetailsAsync(
                new UpdateBaselineDebtDetailsModel(
                    DebtId: existing.SourceDebtId!.Value,
                    Name: trimmedName,
                    Type: cmd.Type,
                    Apr: cmd.Apr,
                    MonthlyFee: cmd.MonthlyFee,
                    MinPayment: cmd.MinPayment,
                    TermMonths: cmd.TermMonths,
                    MonthlyPayment: cmd.MonthlyPayment,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
        }

        // Audit only when at least one side actually moved. The before/after
        // halves are populated only for the side that changed, so the JSON
        // does not lie about what was touched.
        if (monthDetailsChanged || sourceDetailsChanged)
        {
            var monthBefore = monthDetailsChanged
                ? new
                {
                    Name = existing.Name ?? string.Empty,
                    Type = existing.Type,
                    Apr = existing.Apr,
                    MonthlyFee = existing.MonthlyFee,
                    MinPayment = existing.MinPayment,
                    TermMonths = existing.TermMonths,
                    MonthlyPayment = existing.MonthlyPayment
                }
                : null;
            var monthAfter = monthDetailsChanged
                ? new
                {
                    Name = trimmedName,
                    Type = cmd.Type,
                    Apr = cmd.Apr,
                    MonthlyFee = cmd.MonthlyFee,
                    MinPayment = cmd.MinPayment,
                    TermMonths = cmd.TermMonths,
                    MonthlyPayment = cmd.MonthlyPayment
                }
                : null;

            var sourceBefore = sourceDetailsChanged && baselineBefore is not null
                ? new
                {
                    Name = baselineBefore.Name,
                    Type = baselineBefore.Type,
                    Apr = baselineBefore.Apr,
                    MonthlyFee = baselineBefore.MonthlyFee,
                    MinPayment = baselineBefore.MinPayment,
                    TermMonths = baselineBefore.TermMonths,
                    MonthlyPayment = baselineBefore.MonthlyPayment
                }
                : null;
            var sourceAfter = sourceDetailsChanged
                ? new
                {
                    Name = trimmedName,
                    Type = cmd.Type,
                    Apr = cmd.Apr,
                    MonthlyFee = cmd.MonthlyFee,
                    MinPayment = cmd.MinPayment,
                    TermMonths = cmd.TermMonths,
                    MonthlyPayment = cmd.MonthlyPayment
                }
                : null;

            var changeSetJson = JsonSerializer.Serialize(new
            {
                scope,
                currentMonthUpdated = monthDetailsChanged,
                baselineUpdated = sourceDetailsChanged,
                monthBefore,
                monthAfter,
                sourceBefore,
                sourceAfter
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

        // Response row reflects whichever side(s) actually moved. When the
        // month side was skipped (no-op or `budgetPlanOnly` scope), the DTO
        // shows the persisted month values; the FE typically re-queries after
        // a plan-only edit, but returning the unchanged state is honest.
        var resolvedName = monthDetailsChanged ? trimmedName : (existing.Name ?? string.Empty);
        var resolvedType = monthDetailsChanged ? cmd.Type : existing.Type;
        var resolvedApr = monthDetailsChanged ? cmd.Apr : existing.Apr;
        var resolvedMonthlyFee = monthDetailsChanged ? cmd.MonthlyFee : existing.MonthlyFee;
        var resolvedMinPayment = monthDetailsChanged ? cmd.MinPayment : existing.MinPayment;
        var resolvedTermMonths = monthDetailsChanged ? cmd.TermMonths : existing.TermMonths;
        var resolvedMonthlyPayment = monthDetailsChanged ? cmd.MonthlyPayment : existing.MonthlyPayment;

        return Result<BudgetMonthDebtEditorRowDto?>.Success(
            new BudgetMonthDebtEditorRowDto(
                Id: existing.Id,
                SourceDebtId: existing.SourceDebtId,
                Name: resolvedName,
                Type: resolvedType,
                Balance: existing.Balance,
                Apr: resolvedApr,
                MonthlyFee: resolvedMonthlyFee,
                MinPayment: resolvedMinPayment,
                TermMonths: resolvedTermMonths,
                MonthlyPayment: resolvedMonthlyPayment,
                Status: existing.Status,
                IsDeleted: existing.IsDeleted,
                IsMonthOnly: existing.SourceDebtId is null,
                CanUpdateDefault: existing.SourceDebtId is not null));
    }
}
