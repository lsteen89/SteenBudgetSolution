using Backend.Application.DTO;
using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.Cookies;
using Backend.Application.Interfaces.JWT;
using Backend.Application.Interfaces.RecaptchaService;
using Backend.Application.Interfaces.UserServices;
using Backend.Infrastructure.Implementations;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Data.Sql.Provider;
using Backend.Infrastructure.Helpers;
using Backend.Infrastructure.Interfaces;
using System.Security.Claims;

namespace Backend.Application.Services.AuthService
{
    public class AuthService : IAuthService
    {
        private readonly IUserAuthenticationService _userAuthenticationService;
        private readonly IUserSQLProvider _userSQLProvider;
        private readonly IJwtService _jwtService;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IUserTokenService _userTokenService;
        private readonly IWebSocketManager _webSocketManager;
        private readonly LogHelper _logHelper;
        private readonly IEnvironmentService _environmentService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            IUserAuthenticationService userAuthenticationService,
            IUserSQLProvider userSQLProvider,
            IJwtService jwtService,
            IRecaptchaService recaptchaService,
            IUserTokenService userTokenService,
            IWebSocketManager webSocketManager,
            LogHelper logHelper,
            IEnvironmentService environmentService,
            ILogger<AuthService> logger)
        {
            _userAuthenticationService = userAuthenticationService;
            _userSQLProvider = userSQLProvider;
            _jwtService = jwtService;
            _recaptchaService = recaptchaService;
            _userTokenService = userTokenService;
            _webSocketManager = webSocketManager;
            _logHelper = logHelper;
            _environmentService = environmentService;
            _logger = logger;
        }

        public async Task<LoginResultDto> LoginAsync(UserLoginDto userLoginDto, string ipAddress)
        {
            _logger.LogInformation("Processing login for user: email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));

            // Step 1: Validate reCAPTCHA
            bool isTestEmail = Environment.GetEnvironmentVariable("ALLOW_TEST_EMAILS") == "true";
            bool recaptchaValid = isTestEmail && userLoginDto.Email == "l@l.se" || await _recaptchaService.ValidateTokenAsync(userLoginDto.CaptchaToken);
            if (!recaptchaValid)
            {
                _logger.LogWarning("Invalid reCAPTCHA for email: {Email}", userLoginDto.Email);
                return new LoginResultDto { Success = false, Message = "Invalid CAPTCHA!" };
            }

            // Step 2: Check login attempts
            bool isLockedOut = await _userAuthenticationService.CheckLoginAttemptsAsync(userLoginDto.Email);
            if (isLockedOut)
            {
                _logger.LogWarning("User is locked out for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
                return new LoginResultDto { Success = false, Message = "User is locked out! Contact support." };
            }

            // Step 3: Validate credentials
            var validation = await _userAuthenticationService.ValidateCredentialsAsync(userLoginDto.Email, userLoginDto.Password);
            if (!validation.IsValid)
            {
                await _userAuthenticationService.HandleFailedLoginAsync(userLoginDto, ipAddress);
                _logger.LogWarning("Login failed for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));
                return new LoginResultDto { Success = false, Message = validation.ErrorMessage };
            }

            // Step 4: Generate tokens (Access and Refresh tokens)
            var tokens = await _jwtService.GenerateJWTTokenAsync(validation.UserId, validation.Email);
            if (!tokens.Success)
            {
                _logger.LogError("Token generation failed for user: {UserId}", validation.UserId);
                return new LoginResultDto { Success = false, Message = "Token generation failed." };
            }

            // Step 5: Reset failed attempts
            var user = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: userLoginDto.Email);
            if (user != null)
            {
                await ResetFailedLoginAttempts(user.PersoId, userLoginDto.Email);
            }
            else
            {
                _logger.LogWarning("User not found during reset of failed attempts for email: {Email}", userLoginDto.Email);
            }
            _logger.LogInformation("Login successful for email: {MaskedEmail}", _logHelper.MaskEmail(userLoginDto.Email));

            return new LoginResultDto
            {
                UserName = userLoginDto.Email,
                Success = true,
                Message = "Login successful.",
                AccessToken = tokens.AccessToken,
                RefreshToken = tokens.RefreshToken
            };
        }

        public async Task LogoutAsync(ClaimsPrincipal user)
        {
            _logger.LogInformation("Processing logout request.");

            // 1. Clear the auth_token cookie
            //_cookieService.DeleteAuthCookie();

            _logger.LogInformation("auth_token cookie deleted.");

            // 2. Blacklist the token (if implementing token blacklisting)
            await _jwtService.BlacklistJwtTokenAsync(user);

            // 3. Notify the user via WebSocket
            var userId = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await _webSocketManager.SendMessageAsync(userId, "LOGOUT");
                _logger.LogInformation($"Sent LOGOUT message to user {userId} via WebSocket.");
            }
            else
            {
                _logger.LogWarning("User ID not found in claims. Unable to send LOGOUT message via WebSocket.");
            }
        }
        private async Task ResetFailedLoginAttempts(Guid persoId, string email)
        {
            try
            {
                await _userSQLProvider.AuthenticationSqlExecutor.ResetFailedLoginAttemptsAsync(persoId);
                _logger.LogInformation("Failed login attempts reset for user: {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting failed login attempts for user: {Email}", email);
            }
        }
    }
}
