using Backend.Application.DTO.Wizard;
using Backend.Application.Interfaces.WizardService;
using Backend.Common.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using Newtonsoft.Json;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Presentation.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class WizardController : ControllerBase
    {
        private readonly IWizardService _wizardService;
        private readonly ILogger<WizardController> _logger;

        public WizardController(IWizardService wizardService, ILogger<WizardController> logger)
        {
            _wizardService = wizardService;
            _logger = logger;
        }
        [HttpPost("start")]
        public async Task<IActionResult> StartWizard()
        {
            var (ip, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);
            _logger.LogInformation("StartWizard request: IP: {MaskedIP}, User-Agent: {UserAgent}, Device-ID: {DeviceId}",
                LogHelper.MaskIp(ip), ua, deviceId);

            Guid? persoidNullable = User.GetPersoid();

            if (!persoidNullable.HasValue || persoidNullable.Value == Guid.Empty)
            {
                _logger.LogWarning("User Persoid (User ID) not found in token or is invalid.");
                return Unauthorized("User identifier not found in token.");
            }

            Guid persoid = persoidNullable.Value; 

            // Check if the user (identified by their persoid) already has a session.
            // Assuming _wizardService.UserHasWizardSessionAsync(Guid userId) returns Task<Guid?>
            Guid? existingSessionId = await _wizardService.UserHasWizardSessionAsync(persoid);

            if (existingSessionId.HasValue && existingSessionId.Value != Guid.Empty)
            {
                _logger.LogInformation("User {Persoid} already has a wizard session: {SessionId}", persoid, existingSessionId.Value);
                return Ok(new { wizardSessionId = existingSessionId.Value });
            }

            // They don't have a session, so create a new one.

            var creationResult = await _wizardService.CreateWizardSessionAsync(persoid);

            if (!creationResult.IsSuccess) // Check IsSuccess from the tuple
            {
                // Use the message from the result for more specific error logging and response
                _logger.LogError("Failed to create wizard session for User ID {Persoid}: {ErrorMessage}", persoid, creationResult.Message);
                return BadRequest(new { message = creationResult.Message }); // Return the specific message
            }

            // If IsSuccess is true, creationResult.WizardSessionId should contain the new ID
            // (even if the service method sets it to Guid.Empty on failure, IsSuccess is the primary check)
            if (creationResult.WizardSessionId == Guid.Empty)
            {
                // This case might indicate an internal logic issue in the service if IsSuccess was true
                // but WizardSessionId is still Guid.Empty. Or, it's a state the service can return.
                _logger.LogError("Wizard session creation reported success but returned an empty Session ID for User ID {Persoid}.", persoid);
                return BadRequest(new { message = "Failed to create wizard session due to an internal error." });
            }

            _logger.LogInformation("Wizard session {SessionId} created for User ID {Persoid}", creationResult.WizardSessionId, persoid);
            return Ok(new { wizardSessionId = creationResult.WizardSessionId });
        }

        // PUT /api/wizard/{sessionId}/steps/{stepNumber}/{subStepNumber}
        [HttpPut("{sessionId:guid}/steps/{stepNumber:int}/{subStepNumber:int}")]
        public async Task<IActionResult> SaveStepData(
            Guid sessionId,
            int stepNumber,
            int subStepNumber,                 // ← comes from the route now
            [FromBody] WizardStepDto dto)       // dto is slim: { stepData, dataVersion }
        {
            // 1. Authorise (same as before)
            if (!await _wizardService.GetWizardSessionAsync(sessionId))
                return Forbid();

            // 2. Validate + upsert
            try
            {
                var ok = await _wizardService.SaveStepDataAsync(
                    sessionId, stepNumber, subStepNumber,
                    dto.StepData, dto.DataVersion);

                if (!ok) return StatusCode(500, "Failed to save step data.");
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { message = "Validation failed", errors = ex.Errors });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Error saving wizard step data for session {SessionId}", sessionId);
                return StatusCode(500, "An unexpected error occurred.");
            }

            return Ok(new { message = "Step saved successfully." });
        }
        [HttpGet("{sessionId:guid}")]
        public async Task<IActionResult> GetWizardData(Guid sessionId)
        {
            if (!await _wizardService.GetWizardSessionAsync(sessionId))
                return Forbid();

            var wizardData = await _wizardService.GetWizardDataAsync(sessionId);

            _logger.LogDebug("Wizard data before sending: {Data}",
                             JsonConvert.SerializeObject(wizardData));

            return Ok(wizardData);
        }
        /*
        [HttpPost("{sessionId:guid}/complete")]
        public async Task<IActionResult> Complete(Guid sessionId)
        {
            if (!await _wizardService.GetWizardSessionAsync(sessionId)) return Forbid();
            var res = await _wizardService.FinalizeBudgetAsync(sessionId);
            if (!res.IsSuccess) return StatusCode(500, res.Message);
            return NoContent();
        }
        */
    }
}
