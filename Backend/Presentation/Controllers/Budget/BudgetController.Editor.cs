using Backend.Application.DTO.Budget.Months.Editor;
using Backend.Application.Features.Budgets.Months.Editor.Queries;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;

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
}
