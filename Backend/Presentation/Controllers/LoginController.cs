using Backend.Application.Common.Security;
using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.Cookies;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.WebSockets;
using Backend.Common.Interfaces;
using Backend.Common.Utilities;
using Backend.Domain.Auth;
using Backend.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.WebSockets;
using Backend.Settings;
using Microsoft.Extensions.Options;
using Backend.Infrastructure.Services.CookieService;

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
        private readonly IWebHostEnvironment _env;
        private readonly WebSocketSettings _wsCfg;

        public AuthController(ICookieService cookieService, IWebHostEnvironment env, IAuthService authService, IWebSocketManager webSocketManager, IUserTokenService userTokenService, IUserAuthenticationService userAuthenticationService, ILogger<RegistrationController> logger, IRecaptchaService recaptchaService, IUserManagementService userManagementService, IOptions<WebSocketSettings> wsOpts)
        {
            this.cookieService = cookieService;
            _env = env;
            _authService = authService;
            _webSocketManager = webSocketManager;
            _userTokenService = userTokenService;
            _userAuthenticationService = userAuthenticationService;
            _logger = logger;
            _recaptchaService = recaptchaService;
            _userManagementService = userManagementService;
            _wsCfg = wsOpts.Value;
        }

        [HttpPost("login")]
        [EnableRateLimiting("LoginPolicy")]
        public async Task<IActionResult> Login(
                [FromBody] UserLoginDto dto
                //CancellationToken ct TODO: Add cancellation token to all async methods
        )
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var (ip, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);
            _logger.LogInformation("Login request: IP: {MaskedIP}, User-Agent: {UserAgent}, Device-ID: {DeviceId}",
                LogHelper.MaskIp(ip), ua, deviceId);

            var outcome = await _authService.LoginAsync(dto, ip, deviceId, ua);
            
            switch (outcome)
            {
                case LoginOutcome.Fail f:
                    _logger.LogInformation("Login failed for user: {Email}, Reason: {Reason}", dto.Email, f.Error);
                    return Unauthorized(new { message = f.Error });

                case LoginOutcome.Success s:
                    _logger.LogInformation("Login successful for user: {MaskedEmail}", LogHelper.MaskEmail(dto.Email));
                    cookieService.SetRefreshCookie(Response, s.RefreshToken, s.RememberMe);
                    var wsMac = WebSocketAuth.MakeWsMac(s.Access.Persoid, s.Access.SessionId, _wsCfg.Secret);
                    return Ok(new AuthResult(true,
                                             s.Access.Token,
                                             s.Access.Persoid,
                                             s.Access.SessionId,
                                             wsMac));

                default:
                    // should never happen if LoginOutcome is closed
                    throw new InvalidOperationException("Unknown login outcome");
            }
        }


        [Authorize(AuthenticationSchemes = "RefreshScheme")]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromQuery] bool logoutAll = false)
        {
            // Extract metadata using the helper
            var (ipAddress, userAgent, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);
            // Log the metadata for debugging
            _logger.LogInformation("Logout request: IP: {MaskedIP}, User-Agent: {UserAgent}, Device-ID: {DeviceId}",
                 LogHelper.MaskIp(ipAddress), userAgent, deviceId);

            TokenRequestDto req = HttpContext.Map();
            _logger.LogInformation("Logout: AccessToken: {accessToken} RefreshToken: {refreshToken} SessionId: {sessionId}", req.AccessToken, req.RefreshToken, req.SessionId);
            await _authService.LogoutAsync(req.AccessToken, req.RefreshToken, req.SessionId, logoutAllUsers: logoutAll);
            cookieService.DeleteRefreshCookie(Response);
            _logger.LogInformation("Logout successful for sessionId: {SessionId}", req.SessionId);
            return NoContent();
        }

        [Authorize(AuthenticationSchemes = "RefreshScheme")]
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(
            [FromServices] IAuthService auth,
            [FromServices] IConnectionFactory connFactory)     
        {
            /* 1 ─ collect request data */
            TokenRequestDto req = HttpContext.Map();
            var (ip, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);

            _logger.LogInformation("refresh request: IP: {MaskedIP}, User-Agent: {UserAgent}, Device-ID: {DeviceId}, SessionId: {sessionId}",
                LogHelper.MaskIp(ip), ua, deviceId, req.SessionId);

            /* 2 ─ open cn + tx */
            await using var conn = connFactory.CreateConnection();
            await conn.OpenAsync();
            await using var tx = await conn.BeginTransactionAsync();

            AuthStatusResult result;
            try
            {
                /* 3 ─ validate / rotate inside SAME transaction */
                result = await auth.CheckAndRefreshAsync(
                             req.AccessToken,
                             req.RefreshToken,
                             req.SessionId,
                             ua,
                             deviceId,
                             conn, tx);                  

                await tx.CommitAsync();                      // 4  persist changes
            }
            catch
            {
                await tx.RollbackAsync();                    // keep DB clean
                throw;
            }

            if (!result.Authenticated)
                return Unauthorized(new { authenticated = false });

            /* 5 ─ set new refresh cookie, if rotated */
            if (result.NewRefreshCookie is not null)
                cookieService.SetRefreshCookie(Response, result.NewRefreshCookie, result.ShouldBePersistent);
            _logger.LogInformation("Refresh successful for persoid: {Persoid}:", result.Persoid);
            /* 6 ─ return AuthResult + WsMac */
            var wsMac = WebSocketAuth.MakeWsMac(result.Persoid, result.SessionId, _wsCfg.Secret);
            return Ok(new AuthResult(true,
                                     result.AccessToken,
                                     result.Persoid,
                                     result.SessionId,
                                     wsMac));
        }
        [Authorize] 
        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new { message = "All good!" });
        }
    }
}
