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

        // Helper to get the user ID from your JWT “sub” claim
        private Guid CurrentUserId =>
            Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub));
        
        [HttpPost("start")]
        public async Task<IActionResult> StartWizard()
        {
            _logger.LogInformation("Starting wizard session.");

            string? email = User.GetEmail();
            if (string.IsNullOrEmpty(email))
            {
                _logger.LogWarning("User email not found.");
                return Unauthorized("User email not found.");
            }

            // Check if the user already has a session
            Guid existingSessionId = await _wizardService.UserHasWizardSessionAsync(email);
            if (existingSessionId != Guid.Empty)
            {
                _logger.LogInformation("User already has a wizard session.");
                return Ok(new { wizardSessionId = existingSessionId });
            }

            var result = await _wizardService.CreateWizardSessionAsync(email);
            if (!result.IsSuccess)
            {
                _logger.LogError("Failed to create wizard session for email {Email}: {Message}", email, result.Message);
                return BadRequest(new { message = result.Message });
            }

            _logger.LogInformation("Wizard session created for email {Email}", email);
            return Ok(new { wizardSessionId = result.WizardSessionId });
        }
        [HttpPut("steps/{stepNumber}")]
        public async Task<IActionResult> SaveStepData(int stepNumber, [FromBody] WizardStepDto dto)
        {
            if (string.IsNullOrEmpty(dto.WizardSessionId))
            return BadRequest("Missing wizardSessionId");

            // Verify session exists and belongs to this user
            bool userOwnsSession = await _wizardService.GetWizardSessionAsync(dto.WizardSessionId);
            if (!userOwnsSession)
                return Forbid(); // 3) Reject any foreign session

            try
            {
                // Call service which will deserialize, validate, and upsert the data.
                bool saveSuccessful = await _wizardService.SaveStepDataAsync(dto.WizardSessionId, stepNumber, dto.subStepNumber, dto.StepData);
                if (!saveSuccessful)
                    return StatusCode(500, "Failed to save step data.");
            }
            catch (ValidationException vex)
            {
                // Return validation errors to the client
                return BadRequest(new { message = "Validation failed", errors = vex.Errors });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving wizard step data for session {WizardSessionId}", dto.WizardSessionId);
                return StatusCode(500, "An unexpected error occurred.");
            }

            return Ok(new { message = "Step saved successfully." });
        }
        [HttpPost("data")]
        public async Task<IActionResult> GetWizardData(
            [FromBody] WizardSessionRequestDTO dto
        )
        {
            
            if (string.IsNullOrWhiteSpace(dto.wizardSessionId))
            {
                return BadRequest("Wizard session ID is required.");
            }

            // Verify session exists and belongs to this user
            bool userOwnsSession = await _wizardService.GetWizardSessionAsync(dto.wizardSessionId);
            if (!userOwnsSession)
                return Forbid(); // 3) Reject any foreign session


            var wizardData = await _wizardService.GetWizardDataAsync(dto.wizardSessionId);
            if (wizardData == null)
            {
                return NotFound("No wizard data found for the given session.");
            }
            int subStep = await _wizardService.GetWizardSubStep(dto.wizardSessionId);

            _logger.LogDebug("Wizard data before sending: {wizardData}", JsonConvert.SerializeObject(wizardData));

            var response = new WizardSavedDataDTO
            {
                WizardData = wizardData,
                SubStep = subStep
            };

            return Ok(response);
        }
    }
}
