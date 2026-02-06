using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Common.Utilities;
using Backend.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MediatR;
// Mediator
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Features.Budgets.Months.GetBudgetMonthsStatus;
using Backend.Application.Features.Budgets.Months.StartBudgetMonth;
using Backend.Application.Features.Budgets.Months.EnsureFirstBudgetMonth;

using Backend.Presentation.Shared; // For ApiResponse
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Abstractions;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;

namespace Backend.Presentation.Controllers;

[ApiController]
[Route("api/budgets")]
[Authorize]
public sealed class BudgetController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserContext _currentUser;

    public BudgetController(IMediator mediator, ICurrentUserContext currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetDashboardMonthDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetDashboardMonthDto>>> GetDashboard(
        [FromQuery] string? yearMonth,
        CancellationToken ct)
    {
        // Only allowed automation: create current open month if user has zero months.
        await _mediator.Send(new EnsureFirstBudgetMonthCommand(
            Persoid: _currentUser.Persoid,
            ActorPersoid: _currentUser.Persoid
        ), ct);

        var result = await _mediator.Send(
            new GetBudgetDashboardMonthQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetDashboardMonthDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_NOT_FOUND",
                message: result.Error?.Message ?? "No budget found for current user."
            ));
        }

        return Ok(ApiEnvelope<BudgetDashboardMonthDto>.Success(result.Value));
    }
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

}