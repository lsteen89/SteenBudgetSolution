using Backend.Application.DTO;
using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.RecaptchaService;
using Backend.Application.Interfaces.UserServices;
using Backend.Infrastructure.Helpers;
using Backend.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IWebSocketManager _webSocketManager;
        private readonly IUserTokenService _userTokenService;
        private readonly IUserAuthenticationService _userAuthenticationService;
        private readonly ILogger<RegistrationController> _logger;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IUserManagementService _userManagementService;
        private readonly LogHelper _logHelper;

        public AuthController(IAuthService authService, IWebSocketManager webSocketManager, IUserTokenService userTokenService, IUserAuthenticationService userAuthenticationService, ILogger<RegistrationController> logger, IRecaptchaService recaptchaService, IUserManagementService userManagementService, LogHelper logHelper)
        {
            _authService = authService;
            _webSocketManager = webSocketManager;
            _userTokenService = userTokenService;
            _userAuthenticationService = userAuthenticationService;
            _logger = logger;
            _recaptchaService = recaptchaService;
            _userManagementService = userManagementService;
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

            // Delegate login logic to AuthService
            var loginResult = await _authService.LoginAsync(userLoginDto, ipAddress);

            if (!loginResult.Success)
            {
                _logger.LogWarning("Login failed for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
                return Unauthorized(new { success = loginResult.Success, message = loginResult.Message });
            }

            _logger.LogInformation("Login successful for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));

            return Ok(new
            {
                success = loginResult.Success,
                message = loginResult.Message,
                accessToken = loginResult.AccessToken,
                refreshToken = loginResult.RefreshToken
            });

        }
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
        {
            _logger.LogInformation("Processing logout request for user.");

            // Ensure the user is authenticated before proceeding
            if (!User.Identity?.IsAuthenticated ?? true)
            {
                return Unauthorized(new { message = "User is not authenticated." });
            }

            if (!User.Identity?.IsAuthenticated ?? true)
            {
                return Unauthorized(new { message = "User is not authenticated." });
            }
            string? accessToken = Request.Headers["Authorization"]
                                          .FirstOrDefault()?
                                          .Split(" ")
                                          .Last();

            if (string.IsNullOrEmpty(accessToken))
            {
                return Unauthorized(new { success = false, message = "Access token is required." });
            }
            await _authService.LogoutAsync(User, accessToken, request.RefreshToken);

            return Ok(new { message = "Logged out successfully." });
        }

        [Authorize]
        [HttpGet("status")]
        public IActionResult CheckAuthStatus()
        {
            var authStatus = _userAuthenticationService.CheckAuthStatus(User);

            if (authStatus.Authenticated)
            {
                _logger.LogInformation("User is authenticated. Email: {Email}, Role: {Role}", authStatus.Email, authStatus.Role);
                return Ok(authStatus);
            }

            _logger.LogWarning("Unauthorized request. User is not authenticated or claims are missing.");
            return Unauthorized(new AuthStatusDto { Authenticated = false });
        }
        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
        {
            // Log the incoming request
            _logger.LogInformation("Processing refresh token request for RefreshToken: {RefreshToken}", request.RefreshToken);
            
            // Extract the access token from the request headers
            string? accessToken = Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
            _logger.LogInformation("Access token: {AccessToken}", accessToken);

            // Ensure the access token is provided
            if (string.IsNullOrEmpty(accessToken))
            {
                _logger.LogWarning("No access token provided for refresh request.");
                return Unauthorized(new { success = false, message = "Access token is required." });
            }

            // Validate the incoming refresh token and associated user data
            var tokens = await _authService.RefreshTokenAsync(request.RefreshToken, accessToken);
            if (!tokens.Success)
            {
                _logger.LogWarning("Refresh token failed for user: {RefreshToken}", request.RefreshToken);
                return Unauthorized(new { success = false, message = tokens.Message });
            }
            return Ok(new
            {
                success = tokens.Success,
                message = tokens.Message,
                accessToken = tokens.AccessToken,
                refreshToken = tokens.RefreshToken
            });
        }
        public class LogoutRequest
        {
            public string RefreshToken { get; set; }
        }
    }

}
