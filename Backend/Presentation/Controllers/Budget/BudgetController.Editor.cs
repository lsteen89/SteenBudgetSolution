using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem;
using Backend.Application.Features.Budgets.Months.Editor.Queries;
using Backend.Application.DTO.Budget.Months.Editor;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;
using Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItem;
using Backend.Application.Features.Budgets.Months.Editor.Expense.DeleteExpenseItem.DeleteExpenseItem;


namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("months/{yearMonth}/editor")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthEditorDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthEditorDto>>> GetMonthEditor(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthEditorQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthEditorDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EDITOR_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load budget month editor."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthEditorDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/expense-items/{monthExpenseItemId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>>> PatchExpenseItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthExpenseItemId,
        [FromBody] PatchBudgetMonthExpenseItemRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthExpenseItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthExpenseItemId: monthExpenseItemId,
                Name: req.Name,
                CategoryId: req.CategoryId,
                AmountMonthly: req.AmountMonthly,
                IsActive: req.IsActive,
                UpdateDefault: req.UpdateDefault),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EXPENSE_ITEM_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month expense item."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>.Success(result.Value));
    }

    [HttpPost("months/{yearMonth}/expense-items")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>>> CreateExpenseItem(
        [FromRoute] string yearMonth,
        [FromBody] CreateBudgetMonthExpenseItemRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CreateBudgetMonthExpenseItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                CategoryId: req.CategoryId,
                Name: req.Name,
                AmountMonthly: req.AmountMonthly,
                IsActive: req.IsActive),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EXPENSE_ITEM_CREATE_FAILED",
                message: result.Error?.Message ?? "Could not create month expense item."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>.Success(result.Value));
    }

    [HttpDelete("months/{yearMonth}/expense-items/{monthExpenseItemId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<object>>> DeleteExpenseItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthExpenseItemId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new DeleteBudgetMonthExpenseItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthExpenseItemId: monthExpenseItemId),
            ct);

        if (result.IsFailure)
        {
            return Ok(ApiEnvelope<object>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EXPENSE_ITEM_DELETE_FAILED",
                message: result.Error?.Message ?? "Could not delete month expense item."
            ));
        }

        return Ok(ApiEnvelope<object>.Success(new { deleted = true }));
    }
}