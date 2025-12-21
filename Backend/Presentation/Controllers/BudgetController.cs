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

using Backend.Presentation.Shared; // For ApiResponse
using Backend.Domain.Shared;
using Backend.Domain.Abstractions;
using Backend.Application.DTO.Budget.Dashboard;

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
    [ProducesResponseType(typeof(ApiEnvelope<BudgetDashboardDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetDashboardDto>>> GetDashboard(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetBudgetDashboardQuery(_currentUser.Persoid), ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetDashboardDto>.Failure(
                code: "BUDGET_NOT_FOUND",
                message: "No budget found for current user."
            ));
        }

        return Ok(ApiEnvelope<BudgetDashboardDto>.Success(result.Value));
    }
}