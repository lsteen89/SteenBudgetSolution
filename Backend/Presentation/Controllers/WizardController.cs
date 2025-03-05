using Backend.Application.DTO.Wizard;
using Backend.Application.Interfaces.WizardService;
using Backend.Common.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;

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

            try
            {
                // Call service which will deserialize, validate, and upsert the data.
                bool saveSuccessful = await _wizardService.SaveStepDataAsync(dto.WizardSessionId, stepNumber, dto.StepData);
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

    }
}
