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

        // Resolve scope up front so the rest of the handler can branch
        // without re-validating. Validator already rejected unsupported
        // values (`budgetPlanOnly` and anything else); the only case left
        // for null is "client omitted it" → preserve historic month-only
        // behavior.
        var scope = string.IsNullOrWhiteSpace(cmd.Scope)
            ? BudgetMonthIncomeEditScopes.CurrentMonthOnly
            : cmd.Scope!;
        var writesBudgetPlan = BudgetMonthIncomeEditScopes.WritesBudgetPlan(scope);

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

        if (!BudgetMonthEditability.IsEditable(monthMeta.Status))
            return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonth.MonthIsClosed);

        // For month-only create the existing one-query lookup (BudgetMonthIncome.Id)
        // is enough. For plan-writing scopes we also need the budget's
        // plan-side Income.Id to parent the new baseline row to — fetched
        // via the broader read model. Keep the cheap path cheap.
        Guid budgetMonthIncomeId;
        Guid? planSideIncomeId = null;

        if (writesBudgetPlan)
        {
            var forCreate = await _repo.GetBudgetMonthIncomeForCreateAsync(ensured.Value.BudgetMonthId, ct);
            if (forCreate is null)
                return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonthIncomeItemErrors.NotFound);

            // The materializer can produce a BudgetMonthIncome row without a
            // linked plan-side Income (a salary-not-yet-configured edge case).
            // Reject the plan-writing scope honestly instead of silently
            // downgrading to month-only or fabricating a plan row.
            if (forCreate.SourceIncomeId is null)
                return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonthIncomeItemErrors.SourcePlanNotFound);

            budgetMonthIncomeId = forCreate.BudgetMonthIncomeId;
            planSideIncomeId = forCreate.SourceIncomeId;
        }
        else
        {
            var monthIncomeId = await _repo.GetBudgetMonthIncomeIdAsync(ensured.Value.BudgetMonthId, ct);
            if (monthIncomeId is null)
                return Result<BudgetMonthIncomeItemEditorRowDto?>.Failure(BudgetMonthIncomeItemErrors.NotFound);

            budgetMonthIncomeId = monthIncomeId.Value;
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var monthRowId = Guid.NewGuid();
        var trimmedName = cmd.Name.Trim();

        // Plan-row insert (only when scope writes the plan). Done first so
        // the month row can carry the new baseline id as `SourceIncomeItemId`
        // in the same transaction. ITransactionalCommand wraps the whole
        // handler so a failure on the month insert rolls the plan insert back.
        //
        // The plan row is created ACTIVE regardless of the caller's
        // `IsActive` value. Rationale: `cmd.IsActive` semantically means
        // "does this count in the CURRENT month?" — the UI's
        // "Räknas i månaden" toggle. If we let it propagate to the plan
        // row, an inactive-this-month + currentMonthAndBudgetPlan create
        // would silently produce a plan row the materializer never pulls
        // forward (it filters `IsActive = 1 AND EndedAt IS NULL`),
        // defeating the user's "also part of the plan" intent. Salary's
        // sibling — `CreateBudgetMonthSavingsGoalCommandHandler` —
        // hardcodes `Status = "active"` for the plan row for the same
        // reason. To deactivate a plan row later the user must edit the
        // row with `budgetPlanOnly` / `currentMonthAndBudgetPlan` scope.
        Guid? createdPlanRowId = null;
        if (writesBudgetPlan)
        {
            createdPlanRowId = Guid.NewGuid();
            await _repo.InsertBaselineIncomeItemAsync(
                new InsertBaselineIncomeItemModel(
                    Id: createdPlanRowId.Value,
                    IncomeId: planSideIncomeId!.Value,
                    Kind: cmd.Kind,
                    Name: trimmedName,
                    AmountMonthly: cmd.AmountMonthly,
                    IsActive: true,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
        }

        await _repo.InsertMonthIncomeItemAsync(
            new InsertBudgetMonthIncomeItemModel(
                Id: monthRowId,
                BudgetMonthIncomeId: budgetMonthIncomeId,
                Kind: cmd.Kind,
                SourceIncomeItemId: createdPlanRowId,
                Name: trimmedName,
                AmountMonthly: cmd.AmountMonthly,
                IsActive: cmd.IsActive,
                IsDeleted: false,
                ActorPersoid: cmd.Persoid,
                UtcNow: now),
            ct);

        // Single audit event for the create — mirrors the patch-side
        // `baselineUpdated` honesty pattern. The change-set JSON carries the
        // resolved scope and the plan-row id when one was created so the
        // history is reviewable without inspecting plan tables.
        var changeSetJson = JsonSerializer.Serialize(new
        {
            createdEntity = new
            {
                Id = monthRowId,
                Kind = cmd.Kind,
                Name = trimmedName,
                AmountMonthly = cmd.AmountMonthly,
                IsActive = cmd.IsActive,
                IsMonthOnly = !writesBudgetPlan
            },
            scope,
            planRowCreated = writesBudgetPlan,
            planRowId = createdPlanRowId
        });

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: ensured.Value.BudgetMonthId,
                EntityType: BudgetAuditEntityTypes.IncomeItem,
                EntityId: monthRowId,
                SourceEntityId: createdPlanRowId,
                ChangeType: BudgetAuditChangeTypes.Created,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        // When we just created the plan row, surface the same values as
        // `SourceName/SourceAmountMonthly/SourceIsActive` so the response
        // matches what a follow-up GET would return. Right after create the
        // month and plan values are equal by construction, so no
        // `Ändrad i {månad}` badge would render — populating these just
        // keeps the row from briefly looking unlinked in the client cache.
        return Result<BudgetMonthIncomeItemEditorRowDto?>.Success(
            new BudgetMonthIncomeItemEditorRowDto(
                Id: monthRowId,
                SourceIncomeItemId: createdPlanRowId,
                Kind: cmd.Kind,
                Name: trimmedName,
                AmountMonthly: cmd.AmountMonthly,
                IsActive: cmd.IsActive,
                IsDeleted: false,
                IsMonthOnly: !writesBudgetPlan,
                CanUpdateDefault: writesBudgetPlan,
                SourceName: writesBudgetPlan ? trimmedName : null,
                SourceAmountMonthly: writesBudgetPlan ? cmd.AmountMonthly : (decimal?)null,
                // Plan row was forced active above — reflect that here so
                // a follow-up GET and this response agree, and so the
                // client never sees a transient "Ändrad i {månad}" delta
                // against an imaginary inactive plan when the user
                // unchecked "Räknas i månaden" only for this month.
                SourceIsActive: writesBudgetPlan ? true : (bool?)null));
    }
}
