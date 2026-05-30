using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.DeleteIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.GetIncomeItems;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItemsBulk;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("months/{yearMonth}/income-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>>> GetIncomeItems(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthIncomeItemsQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEMS_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load month income items."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Success(result.Value));
    }

    [HttpPost("months/{yearMonth}/income-items")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>>> CreateIncomeItem(
        [FromRoute] string yearMonth,
        [FromBody] CreateBudgetMonthIncomeItemRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CreateBudgetMonthIncomeItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Kind: req.Kind,
                Name: req.Name,
                AmountMonthly: req.AmountMonthly,
                IsActive: req.IsActive,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEM_CREATE_FAILED",
                message: result.Error?.Message ?? "Could not create month income item."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/income-items/{monthIncomeItemId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>>> PatchIncomeItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthIncomeItemId,
        [FromBody] PatchBudgetMonthIncomeItemRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthIncomeItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthIncomeItemId: monthIncomeItemId,
                Name: req.Name,
                AmountMonthly: req.AmountMonthly,
                IsActive: req.IsActive,
                UpdateDefault: req.UpdateDefault,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEM_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month income item."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/income-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>>> PatchIncomeItemsBulk(
        [FromRoute] string yearMonth,
        [FromBody] PatchBudgetMonthIncomeItemsBulkRequestDto req,
        CancellationToken ct)
    {
        var rows = (req?.Items ?? Array.Empty<PatchBudgetMonthIncomeItemBulkRowDto>())
            .Select(item => new PatchBudgetMonthIncomeItemsBulkCommand.Row(
                MonthIncomeItemId: item.MonthIncomeItemId,
                Name: item.Name,
                AmountMonthly: item.AmountMonthly,
                IsActive: item.IsActive,
                UpdateDefault: item.UpdateDefault,
                Scope: item.Scope))
            .ToList();

        var result = await _mediator.Send(
            new PatchBudgetMonthIncomeItemsBulkCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Items: rows),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEMS_BULK_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month income items."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Success(result.Value));
    }

    [HttpDelete("months/{yearMonth}/income-items/{monthIncomeItemId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<object>>> DeleteIncomeItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthIncomeItemId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new DeleteBudgetMonthIncomeItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthIncomeItemId: monthIncomeItemId),
            ct);

        if (result.IsFailure)
        {
            return Ok(ApiEnvelope<object>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEM_DELETE_FAILED",
                message: result.Error?.Message ?? "Could not delete month income item."
            ));
        }

        return Ok(ApiEnvelope<object>.Success(new { deleted = true }));
    }
}
