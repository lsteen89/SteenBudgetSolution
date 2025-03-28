//This class is a orchestrator for the authentication process.
//It handles the login, refresh token and logout processes.
//
//It also uses the TokenGenerator class to hash the refresh token and generate a new one.


using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.JWT;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.WebSockets;
using Backend.Application.Mappers;
using Backend.Application.Models.Token;
using Backend.Common.Interfaces;
using Backend.Common.Utilities;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Data;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.UserQueries;
using Backend.Infrastructure.Security;
using Backend.Infrastructure.WebSockets;
using Backend.Settings;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Application.Helpers.Jwt;

namespace Backend.Application.Services.AuthService
{
    public class AuthService : SqlBase, IAuthService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly IUserAuthenticationService _userAuthenticationService;
        private readonly IUserSQLProvider _userSQLProvider;
        private readonly IJwtService _jwtService;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IUserTokenService _userTokenService;
        private readonly IWebSocketManager _webSocketManager;
        private readonly IEnvironmentService _environmentService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            JwtSettings jwtSettings,
            IConnectionFactory connectionFactory,
            IUserAuthenticationService userAuthenticationService,
            IUserSQLProvider userSQLProvider,
            IJwtService jwtService,
            IRecaptchaService recaptchaService,
            IUserTokenService userTokenService,
            IWebSocketManager webSocketManager,
            IEnvironmentService environmentService,
            ILogger<AuthService> logger
        )
            : base(connectionFactory, logger) 
        {
            _jwtSettings = jwtSettings;
            _userAuthenticationService = userAuthenticationService;
            _userSQLProvider = userSQLProvider;
            _jwtService = jwtService;
            _recaptchaService = recaptchaService;
            _userTokenService = userTokenService;
            _webSocketManager = webSocketManager;
            _environmentService = environmentService;
            _logger = logger;
        }

        public async Task<LoginResultDto> LoginAsync(UserLoginDto userLoginDto, string ipAddress, string deviceId, string userAgent)
        {
            _logger.LogInformation("Processing login for user: email: {MaskedEmail}", LogHelper.MaskEmail(userLoginDto.Email));

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
                _logger.LogWarning("User is locked out for email: {MaskedEmail}", LogHelper.MaskEmail(userLoginDto.Email));
                return new LoginResultDto { Success = false, Message = "User is locked out! Contact support." };
            }

            // Step 3: Validate credentials
            var validation = await _userAuthenticationService.ValidateCredentialsAsync(userLoginDto.Email, userLoginDto.Password);
            if (!validation.IsValid)
            {
                await _userAuthenticationService.HandleFailedLoginAsync(userLoginDto, ipAddress);
                _logger.LogWarning("Login failed for email: {MaskedEmail}", LogHelper.MaskEmail(userLoginDto.Email));
                return new LoginResultDto { Success = false, Message = validation.ErrorMessage };
            }

            // Step 4: Generate tokens (Access and Refresh tokens)
            var tokenResult = await ExecuteInTransactionAsync(async (conn, tx) =>
            {
                JwtTokenModel jwtTokenModel = TokenHelper.CreateTokenModel(validation.Persoid, validation.Email, deviceId, userAgent);
                var result = await _jwtService.GenerateJWTTokenAsync(jwtTokenModel,tx: tx);
                if (!result.Success)
                {
                    throw new Exception("Token generation failed");
                }
                return result;
            });

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
            _logger.LogInformation("Login successful for email: {MaskedEmail}", LogHelper.MaskEmail(userLoginDto.Email));

            return new LoginResultDto
            {
                UserName = userLoginDto.Email,
                Success = true,
                Message = "Login successful.",
                AccessToken = tokenResult.AccessToken,
                RefreshToken = tokenResult.RefreshToken,
                SessionId = tokenResult.SessionId
            };
        }
        public async Task<LoginResultDto> RefreshTokenAsync(string refreshToken, string sessionId, string userAgent, string deviceId, ClaimsPrincipal? user = null)
        {
            const int maxRetries = 3;
            for (int retry = 0; retry < maxRetries; retry++)
            {
                try
                {
                    return await ExecuteInTransactionAsync(async (conn, tx) =>
                    {
                        _logger.LogInformation("Received plain refresh token: {PlainRefreshToken}", refreshToken);
                        _logger.LogInformation("Received sessionId: {sessionId}", sessionId);
                        // Step 1: Combine the collected data in the JwtAuthenticationTokens model
                        var jwtAuthenticationTokens = new JwtAuthenticationTokens
                        {
                            RefreshToken = refreshToken,
                            UserAgent = userAgent,
                            DeviceId = deviceId,
                            SessionId = sessionId
                    };

                    // Step 2
                    // Retrieve the stored refresh token model for the user using a converted hash of the recieved token and convert the entity to the model
                    var providedHashedToken = TokenGenerator.HashToken(jwtAuthenticationTokens.RefreshToken);
                    _logger.LogInformation("Computed refresh token hash: {ComputedHash}", providedHashedToken);
            
                    var storedTokens = await _userSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(refreshToken : providedHashedToken, sessionId : sessionId, conn: conn, tx: tx);
                        var storedToken = storedTokens.FirstOrDefault(); // At this stage, we only expect one token
            
                    if (storedToken == null || string.IsNullOrEmpty(storedToken.RefreshToken))
                    {
                        _logger.LogWarning("No refresh token record found for the provided token.");
                        return new LoginResultDto { Success = false, Message = "Refresh token not found. Please login again." };
                    }
            
                    var mappedToken = RefreshTokenMapper.MapToDomainModel(storedToken);
                    _logger.LogInformation("Stored hashed refresh token: {StoredHash}", storedToken.RefreshToken);

                    // Step 3
                    // Validate the stored token's expiry and expire
                    if (mappedToken.RefreshTokenExpiryDate < DateTime.UtcNow)
                    {
                        return new LoginResultDto { Success = false, Message = "Refresh token expired. Please login again." };
                    }
                    // Expire the current refresh token to prevent reuse
                    bool expireResult = await _userSQLProvider.RefreshTokenSqlExecutor.ExpireRefreshTokenAsync(storedToken.Persoid, conn: conn, tx: tx);
                        if (!expireResult)
                    {
                        return new LoginResultDto { Success = false, Message = "Failed to expire old refresh token." };
                    }

                    // Step 4
                    // Compare the hash of the provided token with the stored hash
                    if (providedHashedToken != mappedToken.RefreshToken)
                    {
                        _logger.LogWarning("Refresh token hash mismatch.");
                        return new LoginResultDto { Success = false, Message = "Invalid refresh token. Please login again." };
                    }

                    // Step 5
                    // Retrieve the user details & generate a new access token and rotate refresh token (if valid)
                    var dbUser = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(persoid: storedToken.Persoid, conn: conn, tx : tx);
                    if(dbUser.Email == null)
                    {
                        return new LoginResultDto { Success = false, Message = "User not found." };
                    }

                    // Create a JwtRefreshTokenModel (for refresh rotation)
                    var JwtRefreshTokenModel = new JwtRefreshTokenModel
                    {
                        Persoid = dbUser.PersoId,
                        RefreshToken = mappedToken.RefreshToken,
                        SessionId = mappedToken.SessionId,
                        AccessTokenJti = mappedToken.AccessTokenJti,
                        RefreshTokenExpiryDate =  DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                        AccessTokenExpiryDate = mappedToken.AccessTokenExpiryDate,
                        DeviceId = mappedToken.DeviceId,
                        UserAgent = mappedToken.UserAgent
                    };

                    // Step 6: Call the refresh overload to generate new tokens
                    var newTokens = await _jwtService.GenerateJWTTokenAsync(JwtRefreshTokenModel, tx: tx);

                        return new LoginResultDto
                    {
                        Success = true,
                        Message = "Token refreshed successfully.",
                        AccessToken = newTokens.AccessToken,
                        RefreshToken = newTokens.RefreshToken,
                        SessionId = newTokens.SessionId,
                    };
                    });
                }
                catch (MySqlConnector.MySqlException ex) when (ex.Message.Contains("Deadlock"))
                {
                    _logger.LogWarning("Deadlock detected during token refresh, retrying... Attempt {Attempt}", retry + 1);
                    if (retry == maxRetries - 1)
                    {
                        _logger.LogError("Max retry attempts reached due to deadlock.");
                        return new LoginResultDto { Success = false, Message = "Concurrent refresh token operation failed due to a deadlock. Please try again." };
                    }
                    await Task.Delay(100 * (retry + 1)); // Exponential backoff
                }
            }
            // Should never reach here.
            return new LoginResultDto { Success = false, Message = "Unexpected error." };
        }
        public async Task LogoutAsync(ClaimsPrincipal user, string accessToken, string refreshToken, string sessionId, bool logoutAll)
        {
            _logger.LogInformation("Processing logout request.");

            var userId = user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                      ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in claims.");
            }

            // 1. Blacklist the access token.
            bool blacklistSuccess = await _jwtService.BlacklistJwtTokenAsync(accessToken);
            if (!blacklistSuccess)
            {
                _logger.LogWarning("Error blacklisting access token for user {UserId}", userId);
                // Optionally, you could throw or continue depending on your security requirements.
            }


            // 2. Handle refresh tokens.
            if (logoutAll)
            {
                // Delete all refresh tokens for the user.
                if (!string.IsNullOrEmpty(userId))
                {
                    await _userSQLProvider.RefreshTokenSqlExecutor.DeleteTokensByUserIdAsync(userId);
                    _logger.LogInformation("All refresh tokens deleted for user {UserId}", userId);
                }
                else
                {
                    _logger.LogWarning("User ID not found. Unable to delete all refresh tokens.");
                }
            }
            else
            {
                // Delete only the refresh token for the current session.
                var providedHashedToken = TokenGenerator.HashToken(refreshToken);
                if (!string.IsNullOrEmpty(refreshToken))
                {
                    bool deleteSuccess = await _userSQLProvider.RefreshTokenSqlExecutor.DeleteTokenAsync(providedHashedToken);
                    if (deleteSuccess)
                    {
                        _logger.LogInformation("Refresh token deleted successfully for session {SessionId}. Token: {TokenHash}", sessionId, providedHashedToken);
                    }
                    else
                    {
                        _logger.LogWarning("Error deleting refresh token for session {SessionId}. Token: {TokenHash}", sessionId, providedHashedToken);
                    }
                }
            }

            // 2. Notify the user via WebSocket
            if (!string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(sessionId))
            {
                var targetUserSession = new UserSessionKey(userId, sessionId);
                await _webSocketManager.SendMessageAsync(targetUserSession, "LOGOUT");
                _logger.LogInformation($"Sent LOGOUT message to user {userId}: SessionId: {sessionId} via WebSocket.");
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
