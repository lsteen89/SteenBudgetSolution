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

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.CreateDebt;

// Debt PR 2: create a debt from the editor.
//
// Three create scopes:
//
//   currentMonthOnly           → month-only row (SourceDebtId = null). Cannot
//                                later use plan-writing scopes; lifecycle
//                                belongs only to this month row.
//   currentMonthAndBudgetPlan  → baseline `Debt` plan row + linked month row.
//                                Both share the create-time field values; the
//                                month row's IsOverride starts at 0 because no
//                                divergence has happened yet.
//   budgetPlanOnly             → baseline `Debt` plan row only; the current
//                                already-materialized month is intentionally
//                                left untouched (the editor's design is to
//                                show this row in future planning, not in
//                                this month's totals).
//
// Always rejects closed / skipped budget months — closed-month immutability is
// the same invariant the existing planned-payment patch enforces. Audit shape
// distinguishes whether the month row and / or source row were created so the
// history is reviewable without re-querying tables.
public sealed class CreateBudgetMonthDebtCommandHandler
    : IRequestHandler<CreateBudgetMonthDebtCommand, Result<CreateBudgetMonthDebtResponseDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public CreateBudgetMonthDebtCommandHandler(
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

    public async Task<Result<CreateBudgetMonthDebtResponseDto?>> Handle(
        CreateBudgetMonthDebtCommand cmd,
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
            return Result<CreateBudgetMonthDebtResponseDto?>.Failure(ensured.Error!);

        // Resolves the owning BudgetId in the same query as the month-row
        // sanity check; the create can't proceed if the month does not exist
        // or is not open, regardless of scope.
        var forCreate = await _repo.GetBudgetMonthForDebtCreateAsync(
            ensured.Value.BudgetMonthId,
            ct);

        if (forCreate is null)
            return Result<CreateBudgetMonthDebtResponseDto?>.Failure(BudgetMonth.NotFound);

        var monthMeta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (monthMeta is null)
            return Result<CreateBudgetMonthDebtResponseDto?>.Failure(BudgetMonth.NotFound);

        if (!string.Equals(monthMeta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase))
            return Result<CreateBudgetMonthDebtResponseDto?>.Failure(BudgetMonth.MonthIsClosed);

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var trimmedName = cmd.Name.Trim();

        // Plan row first so the month row can carry the new baseline id as
        // SourceDebtId in the same transaction. The transactional pipeline
        // behavior rolls both back if the month insert fails.
        Guid? sourceDebtId = null;
        if (writesBudgetPlan)
        {
            sourceDebtId = Guid.NewGuid();
            await _repo.InsertBaselineDebtAsync(
                new InsertBaselineDebtModel(
                    Id: sourceDebtId.Value,
                    BudgetId: forCreate.BudgetId,
                    Name: trimmedName,
                    Type: cmd.Type,
                    Balance: cmd.Balance,
                    Apr: cmd.Apr,
                    MonthlyFee: cmd.MonthlyFee,
                    MinPayment: cmd.MinPayment,
                    TermMonths: cmd.TermMonths,
                    MonthlyPayment: cmd.MonthlyPayment,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
        }

        Guid? monthDebtId = null;
        if (writesCurrentMonth)
        {
            monthDebtId = Guid.NewGuid();
            await _repo.InsertMonthDebtAsync(
                new InsertBudgetMonthDebtModel(
                    Id: monthDebtId.Value,
                    BudgetMonthId: ensured.Value.BudgetMonthId,
                    SourceDebtId: sourceDebtId,
                    Name: trimmedName,
                    Type: cmd.Type,
                    Balance: cmd.Balance,
                    Apr: cmd.Apr,
                    MonthlyFee: cmd.MonthlyFee,
                    MinPayment: cmd.MinPayment,
                    TermMonths: cmd.TermMonths,
                    MonthlyPayment: cmd.MonthlyPayment,
                    // SortOrder mirrors the materializer's default. Editor reads
                    // already break ties by Balance DESC then Name, so a new row
                    // with SortOrder = 0 takes its natural place in the list.
                    SortOrder: 0,
                    ActorPersoid: cmd.Persoid,
                    UtcNow: now),
                ct);
        }

        // Audit: EntityId anchors the event to the row that was actually
        // created on the month side when possible; for a `budgetPlanOnly`
        // create the plan row itself is the anchor (no month row exists).
        // SourceEntityId mirrors the plan row id when one was created.
        var auditEntityId = monthDebtId ?? sourceDebtId!.Value;
        var changeSetJson = JsonSerializer.Serialize(new
        {
            createdEntity = new
            {
                Name = trimmedName,
                Type = cmd.Type,
                Balance = cmd.Balance,
                Apr = cmd.Apr,
                MonthlyFee = cmd.MonthlyFee,
                MinPayment = cmd.MinPayment,
                TermMonths = cmd.TermMonths,
                MonthlyPayment = cmd.MonthlyPayment,
                IsMonthOnly = writesCurrentMonth && !writesBudgetPlan
            },
            scope,
            monthRowCreated = writesCurrentMonth,
            monthRowId = monthDebtId,
            sourceRowCreated = writesBudgetPlan,
            sourceRowId = sourceDebtId
        });

        await _changeEvents.InsertAsync(
            new BudgetMonthChangeEventWriteModel(
                Id: Guid.NewGuid(),
                BudgetMonthId: ensured.Value.BudgetMonthId,
                EntityType: BudgetAuditEntityTypes.Debt,
                EntityId: auditEntityId,
                SourceEntityId: sourceDebtId,
                ChangeType: BudgetAuditChangeTypes.Created,
                ChangeSetJson: changeSetJson,
                ChangedByUserId: cmd.Persoid,
                ChangedAt: now),
            ct);

        // Response: surface whichever halves of the create actually wrote a
        // row. The FE renders the month row when present (current-month
        // scopes) and the source summary for `budgetPlanOnly` so the user
        // can be told the debt starts in future planning without re-fetching.
        var monthRowDto = monthDebtId is null
            ? null
            : new BudgetMonthDebtEditorRowDto(
                Id: monthDebtId.Value,
                SourceDebtId: sourceDebtId,
                Name: trimmedName,
                Type: cmd.Type,
                Balance: cmd.Balance,
                Apr: cmd.Apr,
                MonthlyFee: cmd.MonthlyFee,
                MinPayment: cmd.MinPayment,
                TermMonths: cmd.TermMonths,
                MonthlyPayment: cmd.MonthlyPayment,
                Status: "active",
                IsDeleted: false,
                IsMonthOnly: sourceDebtId is null,
                CanUpdateDefault: sourceDebtId is not null);

        var sourceDto = sourceDebtId is null
            ? null
            : new DebtSourceSummaryDto(
                SourceDebtId: sourceDebtId.Value,
                Name: trimmedName,
                Type: cmd.Type,
                Balance: cmd.Balance,
                Apr: cmd.Apr,
                MonthlyFee: cmd.MonthlyFee,
                MinPayment: cmd.MinPayment,
                TermMonths: cmd.TermMonths,
                MonthlyPayment: cmd.MonthlyPayment);

        return Result<CreateBudgetMonthDebtResponseDto?>.Success(
            new CreateBudgetMonthDebtResponseDto(MonthRow: monthRowDto, Source: sourceDto));
    }
}
