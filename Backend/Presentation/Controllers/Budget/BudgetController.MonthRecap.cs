using Backend.Application.DTO.Budget.Months.Recap;
using Backend.Application.Features.Budgets.Months.Recap;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("months/{yearMonth}/recap")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthRecapDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthRecapDto>>> GetMonthRecap(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthRecapQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthRecapDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_RECAP_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load budget month recap."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthRecapDto>.Success(result.Value));
    }
}
