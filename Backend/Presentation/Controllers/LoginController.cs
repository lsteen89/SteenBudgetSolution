using Backend.Application.DTO;
using Backend.Application.Interfaces.RecaptchaService;
using Backend.Application.Interfaces.UserServices;
using Backend.Infrastructure.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserServices _userServices;
        private readonly ILogger<RegistrationController> _logger;
        private readonly IRecaptchaService _recaptchaService;
        private readonly LogHelper _logHelper;

        public AuthController(IUserServices userServices, ILogger<RegistrationController> logger, IRecaptchaService recaptchaService, LogHelper logHelper)
        {
            _userServices = userServices;
            _logger = logger;
            _recaptchaService = recaptchaService;
            _logHelper = logHelper;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserLoginDto userLoginDto)
        {
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

            // Step 3: Validate credentials
            var result = await _userServices.LoginAsync(userLoginDto);
            if (!result.Success)
            {
                _logger.LogWarning("Login failed for email:  {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
                return Unauthorized(new { success = result.Success, message = result.Message });
            }

            _logger.LogInformation("Login successful for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
            return Ok(new { success = result.Success, message = result.Message });

        }
        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { message = "Test API (GET) called successfully!" });
        }

        private string GenerateJwtToken(string username)
        {
            // Implement JWT token generation logic
            return null;
        }
    }

}
