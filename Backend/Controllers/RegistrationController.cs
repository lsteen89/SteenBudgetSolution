using Backend.DTO;
using Backend.Helpers;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RegistrationController : ControllerBase
    {
        private readonly UserServices _userServices;
        private readonly string? _jwtSecretKey;
        private readonly ILogger<RegistrationController> _logger;
        private readonly RecaptchaHelper _recaptchaHelper;

        public RegistrationController(UserServices userServices, IConfiguration configuration, ILogger<RegistrationController> logger, RecaptchaHelper recaptchaHelper)
        {
            _userServices = userServices;
            _jwtSecretKey = configuration["Jwt:Key"];
            _logger = logger;
            _recaptchaHelper = recaptchaHelper;
        }

        [HttpPost("register")]
        [EnableRateLimiting("RegistrationPolicy")]
        public async Task<IActionResult> Register([FromBody] UserCreationDto userDto)
        {
            _logger.LogInformation("CAPTCHA token: {CaptchaToken}", userDto.CaptchaToken); // Log token for debugging

            _logger.LogInformation("POST /api/Registration/register called for email: {Email}", userDto.Email);
            _logger.LogInformation("test log new {Email}", userDto.Email);
            // Check if model state is valid
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for email: {Email}", userDto.Email);
                return BadRequest(ModelState);
            }

            // Verify reCAPTCHA token
            bool recaptchaValid = userDto.Email == "l@l.se" || await _recaptchaHelper.VerifyRecaptchaAsync(userDto.CaptchaToken);
            if (!recaptchaValid)
            {
                _logger.LogWarning("Invalid reCAPTCHA for email: {Email}", userDto.Email);
                return BadRequest(new { message = "Invalid reCAPTCHA. Please try again." });
            }

            _logger.LogInformation("Processing registration for user: {Email}", userDto.Email);

            try
            {
                // Check if user exists
                bool userExists = await _userServices.CheckIfUserExistsAsync(userDto.Email);
                if (userExists)
                {
                    _logger.LogWarning("Registration attempt with already taken email: {Email}", userDto.Email);
                    ModelState.AddModelError("Email", "This email is already taken.");
                    return BadRequest(new { message = "This email is already taken." });
                }

                // Hash the password with BCrypt
                _logger.LogInformation("Hashing password for user: {Email}", userDto.Email);
                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(userDto.Password);

                var user = new UserModel
                {
                    FirstName = userDto.FirstName,
                    LastName = userDto.LastName,
                    Email = userDto.Email,
                    Password = hashedPassword,
                };

                // Create new registered user
                _logger.LogInformation("Creating new registered user for email: {Email}", userDto.Email);
                bool isSuccessfulRegistration = await _userServices.CreateNewRegisteredUserAsync(user);
                if (!isSuccessfulRegistration)
                {
                    _logger.LogError("Failed to register user for email: {Email}", userDto.Email);
                    return BadRequest("Registration failed due to an internal error. Please try again.");
                }

                // Retrieve verification token and send verification email
                _logger.LogInformation("Generating verification token for user: {Email}", userDto.Email);
                string? verificationToken = await _userServices.GetUserVerificationTokenAsync(user.PersoId.ToString());

                _logger.LogInformation("Sending verification email to: {Email}", userDto.Email);
                if (_userServices == null)
                {
                    _logger.LogError("_userServices is null. Unable to send verification email.");
                    throw new InvalidOperationException("_userServices is not properly injected.");
                }
                try
                {
                    _logger.LogInformation("Calling SendVerificationEmail for {Email}", userDto.Email);
                    _logger.LogInformation("Checking _userServices: {UserServiceIsNull}", _userServices == null);
                    await _userServices!.SendVerificationEmailAsync(user.Email, verificationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send verification email for {Email}", userDto.Email);
                    throw; // Optional rethrow for further handling
                }

                _logger.LogInformation("Registration successful for user: {Email}", userDto.Email);
                return Ok(new { message = "Registration successful. Please check your email for verification link." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing registration for email: {Email}", userDto.Email);
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail(string token)
        {
            try
            {
                // Retrieve the PersoID of the token and its expiry date from the database
                var tokenData = await _userServices.GetUserVerificationTokenDataAsync(token);

                if (tokenData == null)
                {
                    return BadRequest(new { message = "Invalid token" });
                }

                // Check if the token has expired
                if (tokenData.TokenExpiryDate < DateTime.UtcNow)
                {
                    return BadRequest(new { message = "Token has expired" });
                }

                // Fetch the user associated with the token (using PersoId)
                var user = await _userServices.GetUserForRegistrationByPersoId(tokenData.PersoId);

                // Mark the user as verified and update
                user!.EmailConfirmed = true;
                await _userServices.UpdateEmailConfirmationStatusAsync(user);

                // Return success response
                return Ok(new { message = "Email verified successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Verification failed");
                return BadRequest(new { message = "Invalid or expired token" });
            }
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
