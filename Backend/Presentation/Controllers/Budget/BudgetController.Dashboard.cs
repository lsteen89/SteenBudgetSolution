using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetDashboardMonthDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetDashboardMonthDto>>> GetDashboard(
        [FromQuery] string? yearMonth,
        CancellationToken ct)
    {
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
}