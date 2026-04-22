using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.CloseBudgetMonth;
using Backend.Application.Features.Budgets.Months.GetBudgetMonthsStatus;
using Backend.Application.Features.Budgets.Months.StartBudgetMonth;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("months/status")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthsStatusDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthsStatusDto>>> GetMonthsStatus(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetBudgetMonthsStatusQuery(_currentUser.Persoid), ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthsStatusDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_NOT_FOUND",
                message: "No budget found for current user."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthsStatusDto>.Success(result.Value));
    }

    [HttpPost("months/start")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthsStatusDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthsStatusDto>>> StartMonth(
        [FromBody] StartBudgetMonthRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new StartBudgetMonthCommand(
            Persoid: _currentUser.Persoid,
            ActorPersoid: _currentUser.Persoid,
            Request: req
        ), ct);

        if (result.IsFailure)
        {
            return Ok(ApiEnvelope<BudgetMonthsStatusDto>.Failure(
                code: result.Error!.Code,
                message: result.Error.Message
            ));
        }

        if (result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthsStatusDto>.Failure(
                code: "BUDGET_NOT_FOUND",
                message: "No budget found for current user."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthsStatusDto>.Success(result.Value));
    }

    [HttpPost("/api/budget/months/{yearMonth}/close")]
    [ProducesResponseType(typeof(ApiEnvelope<CloseBudgetMonthResultDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<CloseBudgetMonthResultDto>>> CloseMonth(
        [FromRoute] string yearMonth,
        [FromBody] CloseBudgetMonthRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new CloseBudgetMonthCommand(
            Persoid: _currentUser.Persoid,
            ActorPersoid: _currentUser.Persoid,
            YearMonth: yearMonth,
            Request: req
        ), ct);

        if (result.IsFailure)
        {
            return Ok(ApiEnvelope<CloseBudgetMonthResultDto>.Failure(
                code: result.Error!.Code,
                message: result.Error.Message
            ));
        }

        return Ok(ApiEnvelope<CloseBudgetMonthResultDto>.Success(result.Value!));
    }
}
