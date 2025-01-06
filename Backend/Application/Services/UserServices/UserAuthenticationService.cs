using Backend.Application.DTO;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Interfaces;
using Backend.Infrastructure.Security;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Models;
using Backend.Application.Interfaces.EmailServices;
using System.Data.SqlTypes;
using Backend.Domain.Shared;

namespace Backend.Application.Services.UserServices
{
    public class UserAuthenticationService : IUserAuthenticationService
    {
        private readonly IUserSQLProvider _userSQLProvider;
        private readonly ITokenService _tokenService; 
        private readonly IEnvironmentService _environmentService;
        private readonly IUserTokenService _userTokenService;
        private readonly IEmailResetPasswordService _emailResetPasswordService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UserAuthenticationService> _logger;

        public UserAuthenticationService(
            IUserSQLProvider userSQLProvider,
            ITokenService tokenService,
            IEnvironmentService environmentService,
            IUserTokenService userTokenService,
            IEmailResetPasswordService emailResetPasswordService,
            IHttpContextAccessor httpContextAccessor,
            IConfiguration configuration,
            ILogger<UserAuthenticationService> logger)
        {
            _userSQLProvider = userSQLProvider;
            _tokenService = tokenService;
            _userTokenService = userTokenService;
            _emailResetPasswordService = emailResetPasswordService;
            _environmentService = environmentService;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<ValidationResult> ValidateCredentialsAsync(string email, string password)
        {
            var user = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: email);
            if (user == null) return new ValidationResult(false, "Felaktiga uppgifter");
            if (!user.EmailConfirmed) return new ValidationResult(false, "E-post ej bekräftad");
            if (!BCrypt.Net.BCrypt.Verify(password, user.Password)) return new ValidationResult(false, "Felaktiga uppgifter");
            return new ValidationResult(true);
        }

        public async Task<LoginResultDto> AuthenticateAndGenerateTokenAsync(string email)
        {
            var user = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: email);
            if (user == null)
            {
                _logger.LogWarning("User not found for login: {Email}", email);
                return new LoginResultDto { Success = false, Message = "Invalid credentials" };
            }
            if (_httpContextAccessor.HttpContext == null)
            {
                throw new InvalidOperationException("HttpContext is not available.");
            }

            _logger.LogInformation("Environment service instance type: {Type}", _environmentService.GetType().FullName);

            var token = _tokenService.GenerateJwtToken(user.PersoId.ToString(), email);
            var environment = _environmentService.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                               ?? "Development";
            _logger.LogInformation("Resolved environment: {Environment}", environment);
            var isSecure = environment.ToLower() == "production";

            _httpContextAccessor.HttpContext.Response.Cookies.Append("auth_token", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = isSecure,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddMinutes(15)
            });

            _logger.LogInformation("Cookie auth_token appended with token: {Token}", token);
            _logger.LogInformation("Auth token cookie set: {Token}", token);
            return new LoginResultDto { Success = true, Message = "Login successful", UserName = user.Email, Token = token };
        }
        public async Task<bool> CheckLoginAttemptsAsync(string email)
        {
            // Retrieve user details
            var user = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: email);

            if (user == null)
            {
                _logger.LogWarning("No user found with email: {Email}", email);
                return false; // Allow login flow to proceed for nonexistent user
            }

            // Check if user is locked out
            if (user.LockoutUntil.HasValue)
            {
                if (user.LockoutUntil.Value > DateTime.UtcNow)
                {
                    // User is still locked out
                    _logger.LogWarning("User is locked out until {LockoutUntil} for email: {Email}", user.LockoutUntil, email);
                    return true;
                }
                else
                {
                    // Automatically unlock the user if lockout period has expired
                    await _userSQLProvider.AuthenticationSqlExecutor.UnlockUserAsync(user.PersoId);
                    _logger.LogInformation("User lockout expired and user is now unlocked for email: {Email}", email);
                }
            }

            // Check recent failed attempts
            var recentFailedAttempts = await _userSQLProvider.AuthenticationSqlExecutor.GetRecentFailedAttemptsAsync(user.PersoId);
            if (recentFailedAttempts >= 5)
            {
                _logger.LogWarning("User exceeded failed login attempts and will be locked out for email: {Email}", email);

                // Lock the user
                await LockUserAsync(user.Email, TimeSpan.FromMinutes(15)); // Lock for 15 minutes
                return true; // User is locked out
            }

            return false; // User can attempt login
        }

        public async Task RecordFailedLoginAsync(string email, string ipAddress)
        {
            await _userSQLProvider.AuthenticationSqlExecutor.RecordFailedLoginAsync(email, ipAddress);
        }
        public async Task<bool> ShouldLockUserAsync(string email)
        {
            var user = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: email);
            if (user == null) return false;

            var recentFailedAttempts = await _userSQLProvider.AuthenticationSqlExecutor.GetRecentFailedAttemptsAsync(user.PersoId);
            return recentFailedAttempts >= 5;
        }
        public async Task LockUserAsync(string email, TimeSpan lockoutDuration)
        {
            await _userSQLProvider.AuthenticationSqlExecutor.LockUserAsync(email, lockoutDuration);
        }
        public async Task<bool> SendResetPasswordEmailAsync(string email)
        {

            // Check if user exists
            var user = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: email);
            if (user == null)
            {
                _logger.LogWarning("Password reset requested for non-existent email: {Email}", email);
                return true; // Avoid user enumeration
            }
            var emailSent = await _emailResetPasswordService.ResetPasswordEmailSender(user);
            if(emailSent)
            {
                _logger.LogInformation("Password reset email sent to: {Email}", email);
                return true;
            }
            else
            {
                _logger.LogError("Failed to send password reset email to: {Email}", email);
                return false;
            }
        }
        public async Task<OperationResult> UpdatePasswordAsync(Guid token, string password)
        {
            // Check if the environment is in testing
            var environment = _configuration["Environment"]; // Use the key from appsettings
            if (environment == "Development")
            {
                _logger.LogInformation("Skipping token validation in testing environment.");
                return OperationResult.SuccessResult(Messages.PasswordReset.PasswordUpdated); // Always return true for testing
            }
            var isValid = await _userTokenService.ValidateResetTokenAsync(token);
            if (!isValid)
            {
                _logger.LogWarning(Messages.PasswordReset.InvalidToken);
                return OperationResult.FailureResult(Messages.PasswordReset.InvalidToken, statusCode: 400);
            }

            var user = await _userSQLProvider.TokenSqlExecutor.GetUserFromResetTokenAsync(token);
            if (user == null)
            {
                _logger.LogWarning(Messages.PasswordReset.InvalidToken);
                return OperationResult.FailureResult(Messages.PasswordReset.InvalidToken, statusCode: 400);
            }

            if (BCrypt.Net.BCrypt.Verify(password, user.Password))
            {
                _logger.LogWarning(Messages.PasswordReset.SamePassword);
                return OperationResult.FailureResult(Messages.PasswordReset.SamePassword, statusCode: 400);
            }

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);
            var success = await _userSQLProvider.AuthenticationSqlExecutor.UpdatePasswordAsync(user.PersoId, hashedPassword);

            if (success)
            {
                _logger.LogInformation(Messages.PasswordReset.PasswordUpdated);
                return OperationResult.SuccessResult(Messages.PasswordReset.PasswordUpdated);
            }
            else
            {
                _logger.LogError(Messages.PasswordReset.UpdateFailed);
                return OperationResult.FailureResult(Messages.PasswordReset.UpdateFailed, statusCode: 500);
            }
        }

    }
}
