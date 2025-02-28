using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Backend.Application.Interfaces.WizardService;
using Backend.Application.DTO.User;
using Backend.Application.DTO.Wizard;
using System.Security.Claims;

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

            string? email = User.FindFirst("email")?.Value;
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

    }
}
