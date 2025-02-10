using Backend.Application.DTO;
using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.Cookies;
using Backend.Application.Interfaces.RecaptchaService;
using Backend.Application.Interfaces.UserServices;
using Backend.Common.Utilities;
using Backend.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Newtonsoft.Json.Linq;
using Org.BouncyCastle.Asn1.Ocsp;
using System.Security.Claims;

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
            cookieService.SetAuthCookies(Response, loginResult.AccessToken, loginResult.RefreshToken);
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

            if (!User.Identity?.IsAuthenticated ?? true)
            {
                return Unauthorized(new { message = "User is not authenticated." });
            }

            // Retrieve tokens from cookies instead of headers
            string? accessToken = Request.Cookies["AccessToken"];
            string? refreshToken = Request.Cookies["RefreshToken"];

            if (string.IsNullOrEmpty(accessToken))
            {
                return Unauthorized(new { success = false, message = "Access token is required." });
            }

            try
            {
                await _authService.LogoutAsync(User, accessToken, refreshToken, logoutAll);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout.");
                return StatusCode(500, new { success = false, message = "An internal error occurred during logout." });
            }

            Response.Cookies.Delete("AccessToken");
            Response.Cookies.Delete("RefreshToken");
            _logger.LogInformation("User logged out successfully.");

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
        public async Task<IActionResult> RefreshToken()
        {
            // Extract metadata using the helper
            var (ipAddress, userAgent, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);
            _logger.LogInformation("Login request: IP: {IpAddress}, User-Agent: {UserAgent}, Device-ID: {DeviceId}",
                ipAddress, userAgent, deviceId);

            // Extract tokens from cookies using the utility method
            var refreshToken = RequestMetadataHelper.ExtractTokensFromCookies(HttpContext);

            _logger.LogInformation("Processing refresh token request for RefreshToken: {RefreshToken}", refreshToken);

            // Ensure tokens are provided
            if (string.IsNullOrEmpty(refreshToken.RefreshToken))
            {
                _logger.LogWarning("Missing refreshtoken for refresh.");
                return Unauthorized(new { success = false, message = "Missing tokens." });
            }

            _logger.LogInformation("Processing refresh token request from cookies.");

            // Validate the incoming refresh token and associated user data
            var tokens = await _authService.RefreshTokenAsync(refreshToken.RefreshToken, userAgent, deviceId);
            if (!tokens.Success)
            {
                _logger.LogWarning("Refresh token failed for user: {RefreshToken}", refreshToken);
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
    }
}
