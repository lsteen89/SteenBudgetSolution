using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.Cookies;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.WebSockets;
using Backend.Common.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Backend.Common.Interfaces;
using Backend.Application.DTO.User;
using Backend.Application.DTO.Auth;

namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ICookieService cookieService;
        private readonly IAuthService _authService;
        private readonly IWebSocketManager _webSocketManager;
        private readonly IUserTokenService _userTokenService;
        private readonly IUserAuthenticationService _userAuthenticationService;
        private readonly ILogger<RegistrationController> _logger;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IUserManagementService _userManagementService;


        public AuthController(ICookieService cookieService, IAuthService authService, IWebSocketManager webSocketManager, IUserTokenService userTokenService, IUserAuthenticationService userAuthenticationService, ILogger<RegistrationController> logger, IRecaptchaService recaptchaService, IUserManagementService userManagementService)
        {
            this.cookieService = cookieService;
            _authService = authService;
            _webSocketManager = webSocketManager;
            _userTokenService = userTokenService;
            _userAuthenticationService = userAuthenticationService;
            _logger = logger;
            _recaptchaService = recaptchaService;
            _userManagementService = userManagementService;
        }

        [HttpPost("login")]
        [EnableRateLimiting("LoginPolicy")]
        public async Task<IActionResult> Login(UserLoginDto userLoginDto)
        {
            // Extract metadata using the helper
            var (ipAddress, userAgent, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);

            // Log the metadata for debugging
            _logger.LogInformation("Login request: IP: {IpAddress}, User-Agent: {UserAgent}, Device-ID: {DeviceId}",
                ipAddress, userAgent, deviceId);

            // Delegate login logic to AuthService
            var loginResult = await _authService.LoginAsync(
                userLoginDto,
                ipAddress,
                deviceId,
                userAgent
            );

            if (!loginResult.Success)
            {
                _logger.LogWarning("Login failed for email: {MaskedEmail}\nIP: {MaskedIP}", LogHelper.MaskEmail(userLoginDto.Email), LogHelper.MaskIp(ipAddress));
                return Unauthorized(new { success = loginResult.Success, message = loginResult.Message });
            }
            cookieService.SetAuthCookies(Response, loginResult.AccessToken, loginResult.RefreshToken, loginResult.SessionId);
            _logger.LogInformation("Login successful for email: {MaskedEmail}\nIP: {MaskedIP}", LogHelper.MaskEmail(userLoginDto.Email), LogHelper.MaskIp(ipAddress));

            return Ok(new
            {
                UserName = userLoginDto.Email,
                Success = true,
                Message = "Login successful.",
            });

        }
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromQuery] bool logoutAll = false)
        {
            // Extract metadata using the helper
            var (ipAddress, userAgent, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);

            // Log the metadata for debugging
            _logger.LogInformation("Logout request: IP: {IpAddress}, User-Agent: {UserAgent}, Device-ID: {DeviceId}",
                ipAddress, userAgent, deviceId);

            // Retrieve tokens from cookies instead of headers
            string? refreshToken = cookieService.GetCookieValue(HttpContext.Request, "RefreshToken");
            string? accessToken = cookieService.GetCookieValue(HttpContext.Request, "AccessToken");
            string? sessionId = cookieService.GetCookieValue(HttpContext.Request, "SessionId");

            if (string.IsNullOrEmpty(accessToken))
            {
                return Unauthorized(new { success = false, message = "Access token is required." });
            }
            try
            {
                await _authService.LogoutAsync(User, accessToken, refreshToken, sessionId, logoutAll);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout.");
                return StatusCode(500, new { success = false, message = "An internal error occurred during logout." });
            }

            // Delete all authentication cookies.
            cookieService.DeleteCookie(Response, "AccessToken");
            cookieService.DeleteCookie(Response, "RefreshToken");
            cookieService.DeleteCookie(Response, "SessionId");
            _logger.LogInformation("User logged out successfully.");

            return Ok(new { message = "Logged out successfully." });
        }

        [Authorize]
        [HttpGet("status")]
        public async Task<IActionResult> CheckAuthStatus()
        {
            var authStatus = _userAuthenticationService.CheckAuthStatus(User);

            if (authStatus.Authenticated)
            {
                _logger.LogInformation("User is authenticated. Email: {Email}, Role: {Role}", authStatus.Email, authStatus.Role);

                // Check if the user is logging in for the first time
                authStatus.FirstTimeLogin = await _userManagementService.NeedsInitialSetupAsync(authStatus.Email);

                return Ok(authStatus);
            }

            _logger.LogWarning("Unauthorized request. User is not authenticated or claims are missing.");
            return Unauthorized(new AuthStatusDto { Authenticated = false });
        }
        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            // Extract metadata using the helper
            var (ipAddress, userAgent, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);
            _logger.LogInformation("Login request: IP: {IpAddress}, User-Agent: {UserAgent}, Device-ID: {DeviceId}",
                ipAddress, userAgent, deviceId);

            // Extract tokens from cookies using the utility method
            var refreshCookies = RequestMetadataHelper.ExtractTokensFromCookies(HttpContext);

            _logger.LogInformation("Processing refresh token request for RefreshToken: {RefreshToken} SessionId: {SessionId}", refreshCookies.RefreshToken, refreshCookies.SessionId);

            // Ensure tokens are provided
            if (string.IsNullOrEmpty(refreshCookies.RefreshToken))
            {
                _logger.LogWarning("Missing refreshtoken for refresh.");
                return Unauthorized(new { success = false, message = "Missing tokens." });
            }

            _logger.LogInformation("Processing refresh token request from cookies.");

            // Validate the incoming refresh token and associated user data
            var tokens = await _authService.RefreshTokenAsync(refreshCookies.RefreshToken, refreshCookies.SessionId, userAgent, deviceId);
            if (!tokens.Success)
            {
                _logger.LogWarning("Refresh token failed for user: RefreshToken: {RefreshToken} SessionId: {SessionId}", refreshCookies.RefreshToken, refreshCookies.SessionId);
                return Unauthorized(new { success = false, message = tokens.Message });
            }

            // Set the new tokens in the response cookies using the utility method
            cookieService.SetAuthCookies(Response, tokens.AccessToken, tokens.RefreshToken, tokens.SessionId);
            // Dont forget to logout on the client side if the refresh token is invalid
            // Also, we should delete old cookies if the refresh token is valid
            return Ok(new
            {
                success = tokens.Success,
                message = tokens.Message
            });
        }
        [Authorize] 
        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new { message = "All good!" });
        }
    }
}
