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

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchBaseSavings;

// Per-month base-savings ("Bassparande") writer. Pattern mirrors
// `PatchBudgetMonthSavingsGoalCommandHandler` — same lifecycle gate, same
// closed-month rejection, same audit shape — but writes the scalar held in
// `BudgetMonthSavings.MonthlySavings` / `Savings.MonthlySavings` instead of
// the goal contribution.
//
// Orphan rule: when the month row has no `SourceSavingsId`, plan-writing
// scopes are rejected with `BaseSavings.PlanMissing`. We do **not** create a
// `Savings` row implicitly — the FE dialog is expected to drop the plan
// scopes via the response's `IsMonthOnly` flag.
//
// No-op: equal-by-value writes skip both the SQL update and the audit row,
// so duplicate clicks / network retries stay quiet.
public sealed class PatchBudgetMonthBaseSavingsCommandHandler
    : IRequestHandler<PatchBudgetMonthBaseSavingsCommand, Result<BudgetMonthBaseSavingsEditorDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthBaseSavingsMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthBaseSavingsCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthBaseSavingsMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public async Task<Result<BudgetMonthBaseSavingsEditorDto?>> Handle(
        PatchBudgetMonthBaseSavingsCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthBaseSavingsEditorDto?>.Failure(ensured.Error!);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<BudgetMonthBaseSavingsEditorDto?>.Failure(BudgetMonth.NotFound);

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<BudgetMonthBaseSavingsEditorDto?>.Failure(BudgetMonth.MonthIsClosed);

        var existing = await _repo.GetBudgetMonthBaseSavingsForEditAsync(
            ensured.Value.BudgetMonthId,
            ct);

        if (existing is null)
            return Result<BudgetMonthBaseSavingsEditorDto?>.Failure(BaseSavingsErrors.NotFound);

        var scope = ResolveScope(cmd.Scope);
        var writesCurrentMonth = BudgetMonthBaseSavingsEditScopes.WritesCurrentMonth(scope);
        var writesBudgetPlan = BudgetMonthBaseSavingsEditScopes.WritesBudgetPlan(scope);
        var isMonthOnly = existing.SourceSavingsId is null;

        // Orphan rule. Reject before any write so the operation is atomic in
        // intent: either the plan is editable or it is not.
        if (writesBudgetPlan && isMonthOnly)
            return Result<BudgetMonthBaseSavingsEditorDto?>.Failure(BaseSavingsErrors.PlanMissing);

        // Decimal equality is by value (`2400.00m == 2400m`). Treat
        // numerically-equal amounts as no-ops so retries and double-clicks do
        // not produce misleading audit rows.
        var amountChanged = cmd.AmountMonthly != existing.MonthlySavings;

        if (!amountChanged)
        {
            return Result<BudgetMonthBaseSavingsEditorDto?>.Success(
                new BudgetMonthBaseSavingsEditorDto(
                    MonthlyAmount: existing.MonthlySavings,
                    IsMonthOnly: isMonthOnly));
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;

        if (writesCurrentMonth)
        {
            await _repo.UpdateMonthBaseSavingsAsync(
                new UpdateBudgetMonthBaseSavingsModel(
                    Id: existing.Id,
                    MonthlySavings: cmd.AmountMonthly,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
        }

        if (writesBudgetPlan)
        {
            await _repo.UpdateBaselineBaseSavingsAsync(
                new UpdateBaselineBaseSavingsModel(
                    SavingsId: existing.SourceSavingsId!.Value,
                    MonthlySavings: cmd.AmountMonthly,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
        }

        var changeSetJson = JsonSerializer.Serialize(new
        {
            before = new { MonthlySavings = existing.MonthlySavings },
            after = new { MonthlySavings = cmd.AmountMonthly },
            scope,
            currentMonthUpdated = writesCurrentMonth,
            baselineUpdated = writesBudgetPlan,
        });

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: ensured.Value.BudgetMonthId,
                EntityType: BudgetAuditEntityTypes.BaseSavings,
                EntityId: existing.Id,
                SourceEntityId: existing.SourceSavingsId,
                ChangeType: BudgetAuditChangeTypes.Updated,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        // The persisted current-month amount only changes when the request
        // wrote the current month. A pure `budgetPlanOnly` edit leaves the
        // month row alone, so the response still reflects the row's prior
        // value — the dashboard will read the new plan amount only when a
        // future month is materialized.
        var persistedMonthAmount = writesCurrentMonth
            ? cmd.AmountMonthly
            : existing.MonthlySavings;

        return Result<BudgetMonthBaseSavingsEditorDto?>.Success(
            new BudgetMonthBaseSavingsEditorDto(
                MonthlyAmount: persistedMonthAmount,
                IsMonthOnly: isMonthOnly));
    }

    private static string ResolveScope(string? requestedScope)
    {
        if (!string.IsNullOrWhiteSpace(requestedScope) &&
            BudgetMonthBaseSavingsEditScopes.IsSupported(requestedScope))
        {
            return requestedScope!;
        }

        return BudgetMonthBaseSavingsEditScopes.CurrentMonthOnly;
    }
}
