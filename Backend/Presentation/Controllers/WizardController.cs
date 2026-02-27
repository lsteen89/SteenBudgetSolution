using Backend.Application.DTO.Wizard;
using Backend.Common.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Application.Features.Wizard.SaveStep;
using Backend.Application.Features.Wizard.StartWizard;
using Backend.Application.Features.Wizard.AuthorizeSession;
using Backend.Application.Features.Wizard.GetWizardData;
using Backend.Application.Features.Wizard.Finalization;
using Backend.Presentation.Shared;
using MediatR;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Domain.Entities.Wizard;
using Backend.Application.Features.Wizard.FinalizationPreview;
using Backend.Domain.Shared;

namespace Backend.Presentation.Controllers
{
    [Authorize(Policy = "EmailConfirmed")]
    [Route("api/wizard")]
    [ApiController]
    public class WizardController : ControllerBase
    {
        private readonly ISender _mediator;
        private readonly ILogger<WizardController> _logger;

        public WizardController(ISender mediator, ILogger<WizardController> logger)
        {
            _mediator = mediator;
            _logger = logger;
        }
        [HttpPost("start")]
        [ProducesResponseType(typeof(ApiEnvelope<StartWizardResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<StartWizardResponse>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiEnvelope<StartWizardResponse>), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ApiEnvelope<StartWizardResponse>>> StartWizard(CancellationToken ct)
        {
            var userId = User.GetPersoid();
            if (!userId.HasValue)
            {
                var env = ApiEnvelope<StartWizardResponse>.Failure(
                    "Token.Invalid",
                    "User identifier not found in token."
                );
                return Unauthorized(env);
            }

            var result = await _mediator.Send(new StartWizardCommand(userId.Value), ct);

            return result.ToApiEnvelope();
        }

        [HttpPut("{sessionId:guid}/steps/{stepNumber:int}/{subStepNumber:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> SaveStepData(
            Guid sessionId, int stepNumber, int subStepNumber, [FromBody] WizardStepDto dto, CancellationToken ct)
        {
            var persoid = User.GetPersoid();
            if (!persoid.HasValue || !await AuthorizeSession(sessionId, ct))
            {
                return Forbid();
            }
            _logger.LogInformation("Saving wizard step data for session {SessionId}, step {StepNumber}, sub-step {SubStepNumber}.",
                sessionId, stepNumber, subStepNumber);

            _logger.LogInformation("Step data: {@StepData}", dto.StepData);

            var command = new SaveWizardStepCommand(sessionId, stepNumber, subStepNumber, dto.StepData, dto.DataVersion);
            var result = await _mediator.Send(command, ct); // This returns a non-generic Result

            return result.ToApiEnvelope();
        }
        [HttpGet("{sessionId:guid}")]
        [ProducesResponseType(typeof(ApiEnvelope<WizardSavedDataDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<WizardSavedDataDto>), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ApiEnvelope<WizardSavedDataDto?>>> GetWizardData(Guid sessionId, CancellationToken ct)
        {
            // 1. Authorize - does this user own this session?
            // A better long-term solution might be a custom Authorization policy or attribute.
            if (!await AuthorizeSession(sessionId, ct))
            {
                return Forbid();
            }

            // 2. Send the query
            var query = new GetWizardDataQuery(sessionId);
            // SET BREAKPOINT HERE TO GET WIZARD UI BUG
            var result = await _mediator.Send(query, ct);

            // 3. Convert result to HTTP response using the extension method
            return result.ToApiEnvelope();
        }

        // This endpoint finalizes the wizard and creates the budget.
        // Implement the creation of the budgetId and return it
        // POST /api/wizard/{sessionId}/complete
        [HttpPost("{sessionId:guid}/complete")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Complete(Guid sessionId, CancellationToken ct)
        {
            var persoid = User.GetPersoid();

            if (!persoid.HasValue || !await AuthorizeSession(sessionId, ct))
            {
                return Forbid();
            }

            var command = new FinalizeWizardCommand(sessionId, persoid.Value);

            // Result is Result<Guid>
            var result = await _mediator.Send(command, ct);

            if (result.IsSuccess)
            {
                // Force 204 No Content (ignoring the Guid)
                return NoContent();
            }

            // Cast to base (Result) to use the non-generic extension.
            // This returns 'ActionResult' (compatible with IActionResult) 
            // and matches your swagger type ApiEnvelope<object?>
            return ((Result)result).ToApiEnvelope();
        }
        // GET /api/wizard/{sessionId}/finalization-preview
        // Returns a preview of the budget dashboard that would be created upon finalization
        // This helps the user see what to expect before completing the wizard
        // Keeps the calculation logic DRY by reusing the same query handler as the finalization process
        [HttpGet("{sessionId:guid}/finalization-preview")]
        [ProducesResponseType(typeof(ApiEnvelope<BudgetDashboardDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ApiEnvelope<BudgetDashboardDto>>> GetFinalizationPreview(Guid sessionId, CancellationToken ct)
        {
            if (!await AuthorizeSession(sessionId, ct))
                return Forbid();

            var query = new GetWizardFinalizationPreviewQuery(sessionId);
            var result = await _mediator.Send(query, ct);

            return result.ToApiEnvelope();
        }

        // A private helper for DRY authorization checks
        private async Task<bool> AuthorizeSession(Guid sessionId, CancellationToken ct)
        {
            var authQuery = new AuthorizeWizardSessionQuery(User.GetPersoid(), sessionId);
            return await _mediator.Send(authQuery, ct);
        }
    }
}
