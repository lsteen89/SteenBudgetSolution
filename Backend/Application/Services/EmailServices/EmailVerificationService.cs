using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.UserQueries;
using Microsoft.Extensions.Options;
using Backend.Application.Settings;
using Microsoft.Extensions.Logging;
using Backend.Infrastructure.Data.Sql.Interfaces;

namespace Backend.Application.Services.EmailServices
{
    public class EmailVerificationService
    {
        private readonly IUserSqlExecutor _userSqlExecutor;
        private readonly ITokenSqlExecutor _tokenSqlExecutor;
        private readonly IEmailService _emailService;
        private readonly ILogger<EmailVerificationService> _logger;
        private readonly Func<string, Task<bool>> _sendVerificationEmail;
        private readonly Func<DateTime> _getCurrentTime;
        private readonly ResendEmailSettings _settings;

        public EmailVerificationService(IUserSqlExecutor userSqlExecutor, ITokenSqlExecutor tokenSqlExecutor,IEmailService emailService, IOptions<ResendEmailSettings> options, ILogger<EmailVerificationService> logger, Func<string, Task<bool>> sendVerificationEmail, Func<DateTime> getCurrentTime = null)
        {
            _userSqlExecutor = userSqlExecutor;
            _tokenSqlExecutor = tokenSqlExecutor;
            _emailService = emailService;
            _getCurrentTime = getCurrentTime ?? (() => DateTime.UtcNow);
            _settings = options.Value;
            _logger = logger;
            _sendVerificationEmail = sendVerificationEmail;
        }

        public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
        {
            _logger.LogInformation("Starting resend verification email process for email: {Email}", email);

            var currentTime = _getCurrentTime();
            var cooldownPeriod = TimeSpan.FromMinutes(_settings.CooldownPeriodMinutes);
            var dailyLimit = _settings.DailyLimit;
            _logger.LogDebug("Current time is {CurrentTime}", currentTime);

            var user = await CheckUserExistsAsync(email);
            if (user == null) return (false, 404, "User not found.");

            var tracking = await GetOrInitializeTrackingAsync(user.PersoId);
            var resendCheck = IsResendAllowed(tracking, currentTime, cooldownPeriod, dailyLimit);
            if (!resendCheck.IsAllowed) return resendCheck;

            var tokenDeleted = await CheckAndDeleteExpiredTokenAsync(user.PersoId, currentTime);
            if (!tokenDeleted) throw new InvalidOperationException("Failed to delete expired verification token.");

            var emailSent = await SendVerificationEmailAsync(email);
            if (!emailSent) return (false, 500, "Failed to send verification email.");

            await UpdateTrackingInfo(tracking, currentTime);

            return (true, 200, "Verification email has been resent.");
        }

        private async Task<UserModel?> CheckUserExistsAsync(string email)
        {
            var user = await _userSqlExecutor.GetUserModelAsync(email: email);
            if (user == null) _logger.LogWarning("User not found for email: {Email}", email);
            return user;
        }

        private async Task<UserVerificationTrackingModel> GetOrInitializeTrackingAsync(Guid persoId)
        {
            var tracking = await _tokenSqlExecutor.GetUserVerificationTrackingAsync(persoId);
            if (tracking == null)
            {
                tracking = new UserVerificationTrackingModel
                {
                    PersoId = persoId,
                    LastResendRequestDate = _getCurrentTime()
                };
                await _tokenSqlExecutor.InsertUserVerificationTrackingAsync(tracking);
            }
            return tracking;
        }

        private (bool IsAllowed, int StatusCode, string Message) IsResendAllowed(UserVerificationTrackingModel tracking, DateTime currentTime, TimeSpan cooldownPeriod, int dailyLimit)
        {
            if (tracking.LastResendRequestDate == currentTime.Date && tracking.DailyResendCount >= dailyLimit)
                return (false, 429, "Daily resend limit exceeded.");

            if (tracking.LastResendRequestTime.HasValue && currentTime - tracking.LastResendRequestTime.Value < cooldownPeriod)
                return (false, 429, "Please wait before requesting another verification email.");

            return (true, 200, "Resend allowed.");
        }

        private async Task<bool> CheckAndDeleteExpiredTokenAsync(Guid persoId, DateTime currentTime)
        {
            var existingToken = await _tokenSqlExecutor.GetUserVerificationTokenByPersoIdAsync(persoId);
            if (existingToken != null && existingToken.TokenExpiryDate < currentTime)
            {
                int rowsDeleted = await _tokenSqlExecutor.DeleteUserTokenByPersoidAsync(persoId);
                if (rowsDeleted == 0)
                {
                    _logger.LogError("Failed to delete expired verification token for user {PersoId}.", persoId);
                    return false;
                }
                _logger.LogInformation("Expired verification token deleted for user {PersoId}.", persoId);
            }
            return true;
        }

        private async Task<bool> SendVerificationEmailAsync(string email)
        {
            var emailSent = await _sendVerificationEmail(email);
            if (!emailSent) _logger.LogError("Failed to send verification email for user with email: {Email}", email);
            return emailSent;
        }

        private async Task UpdateTrackingInfo(UserVerificationTrackingModel tracking, DateTime currentTime)
        {
            tracking.LastResendRequestTime = currentTime;
            tracking.DailyResendCount = tracking.LastResendRequestDate == currentTime.Date ? tracking.DailyResendCount + 1 : 1;
            tracking.LastResendRequestDate = currentTime.Date;
            tracking.UpdatedAt = currentTime;
            await _tokenSqlExecutor.UpdateUserVerificationTrackingAsync(tracking);
        }
    }
}
