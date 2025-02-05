//This class is a orchestrator for the authentication process.
//It handles the login, refresh token and logout processes.
//
//It also uses the TokenGenerator class to hash the refresh token and generate a new one.


using Backend.Application.DTO;
using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.JWT;
using Backend.Application.Interfaces.RecaptchaService;
using Backend.Application.Interfaces.UserServices;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Helpers;
using Backend.Infrastructure.Interfaces;
using Backend.Infrastructure.Models;
using Backend.Infrastructure.Security;
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
            var tokens = await _jwtService.GenerateJWTTokenAsync(validation.Persoid, validation.Email, rotateToken: false);
            if (!tokens.Success)
            {
                _logger.LogError("Token generation failed for user: {UserId}", validation.Persoid);
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
        public async Task<LoginResultDto> RefreshTokenAsync(string refreshToken, string accessToken, ClaimsPrincipal? user = null)
        {
            // Step 0: Validate the existing access token before proceeding
            var validatedPrincipal = _jwtService.DecodeExpiredToken(accessToken);
            if (validatedPrincipal == null)
            {
                return new LoginResultDto { Success = false, Message = "Invalid access token. Please log in again." };
            }

            // Step 1
            // Retrieve the stored refresh token model for the user
            var providedHashedToken = TokenGenerator.HashToken(refreshToken);
            JwtTokenModel storedToken = await _userSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokenAsync(providedHashedToken);
            if (storedToken == null)
            {
                return new LoginResultDto { Success = false, Message = "Refresh token not found. Please login again." };
            }

            // Step 2
            // Validate the stored token's expiry
            if (storedToken.ExpiryDate < DateTime.UtcNow)
            {
                return new LoginResultDto { Success = false, Message = "Refresh token expired. Please login again." };
            }

            // Step 3
            // Compare the hash of the provided token with the stored hash
            if (providedHashedToken != storedToken.RefreshToken)
            {
                return new LoginResultDto { Success = false, Message = "Invalid refresh token. Please login again." };
            }

            // Step 4
            // Retrieve the user details & generate a new access token and rotate refresh token (if valid)
            var dbUser = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(persoid: storedToken.Persoid);
            if(dbUser.Email == null)
            {
                return new LoginResultDto { Success = false, Message = "User not found." };
            }

            var newTokens = await _jwtService.GenerateJWTTokenAsync(storedToken.Persoid, dbUser.Email, rotateToken: true, user);

            return new LoginResultDto
            {
                Success = true,
                Message = "Token refreshed successfully.",
                AccessToken = newTokens.AccessToken,
                RefreshToken = newTokens.RefreshToken
            };
        }
        public async Task LogoutAsync(ClaimsPrincipal user, string accessToken)
        {
            _logger.LogInformation("Processing logout request.");

            // 1. Blacklist the token (if implementing token blacklisting)
            await _jwtService.BlacklistJwtTokenAsync(accessToken);

            // 2. Notify the user via WebSocket
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
