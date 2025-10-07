using Backend.Application.DTO.Wizard;
using Backend.Common.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Application.Features.Wizard.SaveStep;
using Backend.Application.Features.Wizard.StartWizard;
using Backend.Application.Features.Wizard.AuthorizeSession;
using Backend.Application.Features.Wizard.GetWizardData;
using Backend.Application.Features.Wizard.FinalizeWizard;
using Backend.Presentation.Shared;
using MediatR;
using Backend.Domain.Shared;
using Backend.Domain.Entities.Wizard;

namespace Backend.Presentation.Controllers
{
    [Authorize]
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
        [ProducesResponseType(typeof(ApiResponse<StartWizardResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ApiResponse<StartWizardResponse>>> StartWizard(CancellationToken ct)
        {
            var userId = User.GetPersoid();
            if (!userId.HasValue)
                return Unauthorized(new ApiErrorResponse("Token.Invalid", "User identifier not found in token."));

            var result = await _mediator.Send(new StartWizardCommand(userId.Value), ct);

            return result.ToApiResponse();
        }

        [HttpPut("{sessionId:guid}/steps/{stepNumber:int}/{subStepNumber:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status500InternalServerError)]
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

            return result.ToApiResponse();
        }
        [HttpGet("{sessionId:guid}")]
        [ProducesResponseType(typeof(ApiResponse<WizardSavedDataDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ApiResponse<WizardSavedDataDTO?>>> GetWizardData(Guid sessionId, CancellationToken ct)
        {
            // 1. Authorize - does this user own this session?
            // A better long-term solution might be a custom Authorization policy or attribute.
            if (!await AuthorizeSession(sessionId, ct))
            {
                return Forbid();
            }

            // 2. Send the query
            var query = new GetWizardDataQuery(sessionId);
            var result = await _mediator.Send(query, ct);

            // 3. Convert result to HTTP response using the extension method
            return result.ToApiResponse();
        }

        // This endpoint finalizes the wizard and creates the budget.
        // Implement the creation of the budgetId and return it
        // POST /api/wizard/{sessionId}/complete
        [HttpPost("{sessionId:guid}/complete")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Complete(Guid sessionId, CancellationToken ct)
        {
            var persoid = User.GetPersoid();

            if (!persoid.HasValue || !await AuthorizeSession(sessionId, ct))
            {
                return Forbid();
            }

            var command = new FinalizeWizardCommand(sessionId, persoid.Value);
            var result = await _mediator.Send(command, ct);

            return result.ToCommandResult("Wizard completed successfully.");
        }

        // A private helper for DRY authorization checks
        private async Task<bool> AuthorizeSession(Guid sessionId, CancellationToken ct)
        {
            var authQuery = new AuthorizeWizardSessionQuery(User.GetPersoid(), sessionId);
            return await _mediator.Send(authQuery, ct);
        }
    }
}
