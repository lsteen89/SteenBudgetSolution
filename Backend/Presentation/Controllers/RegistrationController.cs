using Backend.Application.DTO;
using Backend.Application.Interfaces;
using Backend.Application.Services.UserServices;
using Backend.Domain.Entities;
using Backend.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Transactions;

namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RegistrationController : ControllerBase
    {
        private readonly UserServices _userServices;
        private readonly string? _jwtSecretKey;
        private readonly ILogger<RegistrationController> _logger;
        private readonly IRecaptchaService _recaptchaService;

        public RegistrationController(UserServices userServices, IConfiguration configuration, ILogger<RegistrationController> logger, IRecaptchaService recaptchaService)
        {
            _userServices = userServices;
            _jwtSecretKey = configuration["Jwt:Key"];
            _logger = logger;
            _recaptchaService = recaptchaService;
        }

        [HttpPost("register")]
        [EnableRateLimiting("RegistrationPolicy")]
        public async Task<IActionResult> Register([FromBody] UserCreationDto userCreationDto)
        {
            _logger.LogInformation("Processing registration for user: {Email}", userCreationDto.Email);

            // Step 1: Validate model state
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for email: {Email}", userCreationDto.Email);
                return BadRequest(ModelState);
            }

            // Step 2: Validate reCAPTCHA
            bool isTestEmail = Environment.GetEnvironmentVariable("ALLOW_TEST_EMAILS") == "true";
            bool recaptchaValid = (isTestEmail && userCreationDto.Email == "l@l.se") || await _recaptchaService.ValidateTokenAsync(userCreationDto.CaptchaToken);

            if (!recaptchaValid)
            {
                _logger.LogWarning("Invalid reCAPTCHA for email: {Email}", userCreationDto.Email);
                return BadRequest(new { message = "Ogiltig CAPTCHA!" });
            }

            try
            {
                // Step 3: Create new registered user
                _logger.LogInformation("Creating new registered user for email: {Email}", userCreationDto.Email);
                bool isSuccessfulRegistration = await _userServices.RegisterUserAsync(userCreationDto);
                if (!isSuccessfulRegistration)
                {
                    _logger.LogError("Failed to register user for email: {Email}", userCreationDto.Email);
                    return BadRequest(new { message = "Epost redan upptagen!" });
                }

                // Step 4: Generate verification token for email and Send verification email
                _logger.LogInformation("Creating a token and sending email to: {Email}", userCreationDto.Email);
                bool isVerificationComplete = await _userServices.SendVerificationEmailWithTokenAsync(userCreationDto.Email);
                if (!isVerificationComplete)
                {
                    _logger.LogError("Failed to send verification email for email: {Email}", userCreationDto.Email);
                    return BadRequest(new { message = "Internt fel" });
                }

                _logger.LogInformation("Registration successful for user: {Email}", userCreationDto.Email);
                return Ok(new { message = "Registration successful. Please check your email for verification link." });

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing registration for email: {Email}", userCreationDto.Email);
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail(Guid token)
        {
            if (!Guid.TryParse(token.ToString(), out Guid parsedToken))
            {
                _logger.LogWarning("Invalid token format: {token}", token);
                return BadRequest(new { message = "Invalid token format" });
            }
            bool emailConfirmed = await _userServices.VerifyEmailTokenAsync(token);
            if (!emailConfirmed)
            {
                _logger.LogError("Verification failed for token {token}", token);
                return BadRequest(new { message = "Invalid or expired token" });
            }
            // Return success response
            return Ok(new { message = "Email verified successfully" });
        }
        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerificationEmail([FromBody] ResendVerificationRequest request)
        {
            if (string.IsNullOrEmpty(request.Email))
                return BadRequest("Email is required.");

            // Call the service to handle the resend logic
            var result = await _userServices.ResendVerificationEmailAsync(request.Email);

            if (result.IsSuccess)
                return Ok(result.Message);

            return StatusCode(result.StatusCode, result.Message);
        }

    }
}
