using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
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
