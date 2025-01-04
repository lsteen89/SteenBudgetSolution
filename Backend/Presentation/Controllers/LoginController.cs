using Backend.Application.DTO;
using Backend.Application.Interfaces.RecaptchaService;
using Backend.Application.Interfaces.UserServices;
using Backend.Infrastructure.Helpers;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Backend.Application.DTO;
using Backend.Infrastructure.Interfaces;

namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserServices _userServices;
        private readonly IUserTokenService _userTokenService;
        private readonly IUserAuthenticationService _userAuthenticationService;
        private readonly ILogger<RegistrationController> _logger;
        private readonly IRecaptchaService _recaptchaService;
        private readonly LogHelper _logHelper;

        public AuthController(IUserServices userServices, IUserTokenService userTokenService, IUserAuthenticationService userAuthenticationService, ILogger<RegistrationController> logger, IRecaptchaService recaptchaService, LogHelper logHelper)
        {
            _userServices = userServices;
            _userTokenService = userTokenService;
            _userAuthenticationService = userAuthenticationService;
            _logger = logger;
            _recaptchaService = recaptchaService;
            _logHelper = logHelper;
        }

        [HttpPost("login")]
        [EnableRateLimiting("LoginPolicy")]
        public async Task<IActionResult> Login(UserLoginDto userLoginDto)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            _logger.LogInformation("Processing login for user: email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));

            // Step 1: Validate model state
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid credentials for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
                return BadRequest(ModelState);
            }

            // Step 2: Validate reCAPTCHA
            bool isTestEmail = Environment.GetEnvironmentVariable("ALLOW_TEST_EMAILS") == "true";
            bool recaptchaValid = (isTestEmail && userLoginDto.Email == "l@l.se") || await _recaptchaService.ValidateTokenAsync(userLoginDto.CaptchaToken);
            if (!recaptchaValid)
            {
                _logger.LogWarning("Invalid reCAPTCHA for email: {Email}", userLoginDto.Email);
                return BadRequest(new { message = "Ogiltig CAPTCHA!" });
            }

            // Step 3: Check login attempts
            bool isLockedOut = await _userAuthenticationService.CheckLoginAttemptsAsync(userLoginDto.Email);
            if (isLockedOut)
            {
                _logger.LogWarning("User is locked out for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
                return Unauthorized(new { message = "Användaren är låst! Kontakta support" });
            }

            // Step 4: Validate credentials
            var result = await _userServices.LoginAsync(userLoginDto, ipAddress);
            if (!result.Success)
            {
                _logger.LogWarning("Login failed for email:  {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
                return Unauthorized(new { success = result.Success, message = result.Message });
            }

            _logger.LogInformation("Login successful for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
            return Ok(new { success = result.Success, message = result.Message });

        }
        [HttpPost("generate-reset-password-email")]
        [EnableRateLimiting("EmailSendingPolicy")]
        public async Task<IActionResult> ResetPassword([FromBody] Backend.Application.DTO.ResetPasswordRequest request)
        {
            var emailSent = await _userAuthenticationService.SendResetPasswordEmailAsync(request.Email);

            if (emailSent)
            {
                return Ok(new { message = "Om den angivna e-postadressen är registrerad har ett återställningsmail skickats." });
            }

            return StatusCode(500, new { message = "An error occurred while processing the request." });
        }

        [HttpPost("reset-password-with-token")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPassword request)
        {
            var success = await _userAuthenticationService.UpdatePasswordAsync(request.Token, request.Password);

            if (success)
            {
                return Ok(new { message = "Lösenordet har ändrats!" });
            }
            else
            {
                return BadRequest(new { message = "Felaktig återställingslänk, vänligen försök igen eller kontakta support" });
            }
        }
    }

}
