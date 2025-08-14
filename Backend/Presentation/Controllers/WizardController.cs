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

namespace Backend.Presentation.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
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
        [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> StartWizard(CancellationToken ct)
        {
            Guid? userId = User.GetPersoid();
            if (!userId.HasValue)
            {
                return Unauthorized(new ApiErrorResponse("Token.Invalid", "User identifier not found in token."));
            }

            var command = new StartWizardCommand(userId.Value);
            var result = await _mediator.Send(command, ct);

            return result.ToActionResult();
        }

        [HttpPut("{sessionId:guid}/steps/{stepNumber:int}/{subStepNumber:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> SaveStepData(
            Guid sessionId, int stepNumber, int subStepNumber, [FromBody] WizardStepDto dto, CancellationToken ct)
        {
            // Authorization is a critical first step. Does this user even own this session?
            // 1. Authorize
            var persoid = User.GetPersoid();
            if (!persoid.HasValue || !await AuthorizeSession(sessionId, ct))
            {
                return Forbid();
            }

            var command = new SaveWizardStepCommand(sessionId, stepNumber, subStepNumber, dto.StepData, dto.DataVersion);
            var result = await _mediator.Send(command, ct);

            return result.ToCommandResult("Step saved successfully.");
        }
        [HttpGet("{sessionId:guid}")]
        [ProducesResponseType(typeof(ApiResponse<WizardSavedDataDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetWizardData(Guid sessionId, CancellationToken ct)
        {
            // 1. Authorize
            if (!await AuthorizeSession(sessionId, ct)) return Forbid();

            // 2. Send the query to get the data
            var query = new GetWizardDataQuery(sessionId);
            var result = await _mediator.Send(query, ct);

            // 3. Handle the result
            return result.ToActionResult();
        }
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
