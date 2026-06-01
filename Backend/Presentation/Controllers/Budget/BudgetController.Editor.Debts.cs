using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;
using Backend.Application.Features.Budgets.Months.Editor.Debts.CreateDebt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebtEditor;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Archive;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.MarkPaidOff;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Remove;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Restore;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Participation;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtDetails;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtsBulk;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("months/{yearMonth}/debt-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>>> GetDebtItems(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthDebtsQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_ITEMS_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load month debts."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Success(result.Value));
    }

    // Debt PR 5: target editor read model. One endpoint that returns the
    // full hero / summary / rows / recent-events bundle the FE needs to
    // render the target Debt editor without re-deriving financial state on
    // the client. The legacy `GET /debt-items` route above is retained for
    // compatibility — PR 6 migrates to this richer endpoint and the legacy
    // route will be removed in a follow-up once no caller depends on it.
    [HttpGet("months/{yearMonth}/debt-editor")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtEditorDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtEditorDto>>> GetDebtEditor(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthDebtEditorQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtEditorDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_EDITOR_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load debt editor."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtEditorDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/debt-items/{monthDebtId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtEditorRowDto>>> PatchDebtItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] PatchBudgetMonthDebtRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthDebtCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                MonthlyPayment: req.MonthlyPayment,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_ITEM_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month debt."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtEditorRowDto>.Success(result.Value));
    }

    // Debt PR 2: create a debt from the editor. Three scopes are supported
    // (currentMonthOnly / currentMonthAndBudgetPlan / budgetPlanOnly). The
    // response wraps both halves so a `budgetPlanOnly` create can surface a
    // source summary without claiming a current-month row.
    [HttpPost("months/{yearMonth}/debt-items")]
    [ProducesResponseType(typeof(ApiEnvelope<CreateBudgetMonthDebtResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<CreateBudgetMonthDebtResponseDto>>> CreateDebtItem(
        [FromRoute] string yearMonth,
        [FromBody] CreateBudgetMonthDebtRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CreateBudgetMonthDebtCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Name: req.Name,
                Type: req.Type,
                Balance: req.Balance,
                Apr: req.Apr,
                MonthlyFee: req.MonthlyFee,
                MinPayment: req.MinPayment,
                TermMonths: req.TermMonths,
                MonthlyPayment: req.MonthlyPayment,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<CreateBudgetMonthDebtResponseDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_CREATE_FAILED",
                message: result.Error?.Message ?? "Could not create debt."
            ));
        }

        return Ok(ApiEnvelope<CreateBudgetMonthDebtResponseDto>.Success(result.Value));
    }

    // Debt PR 2: edit metadata (Name / Type / Apr / MonthlyFee / MinPayment /
    // TermMonths / MonthlyPayment) on an existing debt row. Balance is not
    // accepted here — PR 3's `Uppdatera saldo` endpoint owns balance changes.
    // Scope semantics mirror the planned-payment patch (currentMonthOnly /
    // currentMonthAndBudgetPlan / budgetPlanOnly).
    [HttpPatch("months/{yearMonth}/debt-items/{monthDebtId:guid}/details")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtEditorRowDto>>> PatchDebtItemDetails(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] PatchBudgetMonthDebtDetailsRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthDebtDetailsCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                Name: req.Name,
                Type: req.Type,
                Apr: req.Apr,
                MonthlyFee: req.MonthlyFee,
                MinPayment: req.MinPayment,
                TermMonths: req.TermMonths,
                MonthlyPayment: req.MonthlyPayment,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_ITEM_PATCH_DETAILS_FAILED",
                message: result.Error?.Message ?? "Could not update debt details."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtEditorRowDto>.Success(result.Value));
    }

    // Debt PR 3: structured balance-adjustment endpoint. `POST` (not `PATCH`)
    // because each call is an append-only event in `DebtBalanceEvent`, not an
    // idempotent state set. The route lives under the month-debt row so the
    // existing closed-month-immutability guard applies the same way it does
    // to the planned-payment and details patches.
    [HttpPost("months/{yearMonth}/debt-items/{monthDebtId:guid}/balance-adjustments")]
    [ProducesResponseType(typeof(ApiEnvelope<AdjustBudgetMonthDebtBalanceResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<AdjustBudgetMonthDebtBalanceResponseDto>>> AdjustDebtItemBalance(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] AdjustBudgetMonthDebtBalanceRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new AdjustBudgetMonthDebtBalanceCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                NewBalance: req.NewBalance,
                Scope: req.Scope,
                Note: req.Note),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<AdjustBudgetMonthDebtBalanceResponseDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_BALANCE_ADJUST_FAILED",
                message: result.Error?.Message ?? "Could not update debt balance."
            ));
        }

        return Ok(ApiEnvelope<AdjustBudgetMonthDebtBalanceResponseDto>.Success(result.Value));
    }

    // Debt PR 4: per-month skip / include toggle. POST (not PATCH) because
    // each call is an append-only event in `BudgetMonthChangeEvent`. Source
    // lifecycle, planned payment, and balance are intentionally untouched.
    [HttpPost("months/{yearMonth}/debt-items/{monthDebtId:guid}/participation")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>>> SetDebtItemParticipation(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] SetBudgetMonthDebtParticipationRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new SetBudgetMonthDebtParticipationCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                Participation: req.Participation,
                Note: req.Note),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_PARTICIPATION_FAILED",
                message: result.Error?.Message ?? "Could not update debt participation."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Success(result.Value));
    }

    // Debt PR 4: source lifecycle `active → paidOff`. Optionally drives
    // balance to zero through the PR 3 balance path so the two facts stay
    // auditable as separate rows (`BudgetMonthChangeEvent` for lifecycle,
    // `DebtBalanceEvent` for balance).
    [HttpPost("months/{yearMonth}/debt-items/{monthDebtId:guid}/mark-paid-off")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>>> MarkDebtItemPaidOff(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] MarkBudgetMonthDebtPaidOffRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new MarkBudgetMonthDebtPaidOffCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                SetBalanceToZero: req.SetBalanceToZero,
                Note: req.Note),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_MARK_PAID_OFF_FAILED",
                message: result.Error?.Message ?? "Could not mark debt as paid off."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Success(result.Value));
    }

    // Debt PR 4: source lifecycle `active → archived`. Reversible via
    // restore; never deletes history; never moves balance.
    [HttpPost("months/{yearMonth}/debt-items/{monthDebtId:guid}/archive")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>>> ArchiveDebtItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] ArchiveBudgetMonthDebtRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new ArchiveBudgetMonthDebtCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                Note: req.Note),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_ARCHIVE_FAILED",
                message: result.Error?.Message ?? "Could not archive debt."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Success(result.Value));
    }

    // Debt PR 4: source lifecycle `archived → active`. Optionally re-includes
    // the current open month's row in the same transaction.
    [HttpPost("months/{yearMonth}/debt-items/{monthDebtId:guid}/restore")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>>> RestoreDebtItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] RestoreBudgetMonthDebtRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new RestoreBudgetMonthDebtCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                ReIncludeCurrentMonth: req.ReIncludeCurrentMonth,
                Note: req.Note),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_RESTORE_FAILED",
                message: result.Error?.Message ?? "Could not restore debt."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Success(result.Value));
    }

    // Debt PR 4: hide a month-only row from the editor and dashboard.
    // Source-linked rows are rejected with a code that the FE turns into
    // "use archive instead" copy.
    [HttpPost("months/{yearMonth}/debt-items/{monthDebtId:guid}/remove")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>>> RemoveDebtItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] RemoveBudgetMonthDebtRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new RemoveBudgetMonthDebtCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                Note: req.Note),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_REMOVE_FAILED",
                message: result.Error?.Message ?? "Could not remove debt."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtLifecycleActionResponseDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/debt-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>>> PatchDebtItemsBulk(
        [FromRoute] string yearMonth,
        [FromBody] PatchBudgetMonthDebtsBulkRequestDto req,
        CancellationToken ct)
    {
        var rows = (req?.Items ?? Array.Empty<PatchBudgetMonthDebtBulkRowDto>())
            .Select(item => new PatchBudgetMonthDebtsBulkCommand.Row(
                MonthDebtId: item.MonthDebtId,
                MonthlyPayment: item.MonthlyPayment,
                Scope: item.Scope))
            .ToList();

        var result = await _mediator.Send(
            new PatchBudgetMonthDebtsBulkCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Items: rows),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_ITEMS_BULK_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month debts."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Success(result.Value));
    }
}
