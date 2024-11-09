using Backend.DataAccess;
using Backend.Models;
using Backend.Services;
using Backend.Settings;
using Microsoft.Extensions.Options;
using Org.BouncyCastle.Asn1.X509.SigI;

namespace Backend.Helpers
{
    public class UserVerificationHelper
    {
        private readonly SqlExecutor _sqlExecutor;
        private readonly IEmailService _emailService;
        private readonly ILogger<UserVerificationHelper> _logger;
        private readonly Func<string, Task<bool>> _sendVerificationEmail;

        // Mockable time provider
        private readonly Func<DateTime> _getCurrentTime;
        private readonly ResendEmailSettings _settings;

        public UserVerificationHelper(SqlExecutor sqlExecutor, IEmailService emailService, IOptions<ResendEmailSettings> options, ILogger<UserVerificationHelper> logger, Func<string, Task<bool>> sendVerificationEmail, Func<DateTime> getCurrentTime = null)
        {
            _sqlExecutor = sqlExecutor;
            _emailService = emailService;
            _getCurrentTime = getCurrentTime ?? (() => DateTime.UtcNow);
            _settings = options.Value;
            _logger = logger;
            _sendVerificationEmail = sendVerificationEmail;
        }

        public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
        {
            _logger.LogInformation("Starting resend verification email process for email: {Email}", email);
            // step 1: Fetch settings
            var currentTime = _getCurrentTime();
            var cooldownPeriod = TimeSpan.FromMinutes(_settings.CooldownPeriodMinutes);
            var dailyLimit = _settings.DailyLimit;
            _logger.LogDebug("Current time is {CurrentTime}", currentTime);

            // Step 2: Check if the user exists
            var user = await _sqlExecutor.GetUserModelAsync(email: email);
            if (user == null)
            {
                _logger.LogWarning("User not found for email: {Email}", email);
                return (false, 404, "User not found.");
            }

            // Step 3: Fetch tracking info for this user
            var tracking = await _sqlExecutor.GetUserVerificationTrackingAsync(user.PersoId);
            if (tracking == null)
            {
                // Initialize tracking if it doesn’t exist
                tracking = new UserVerificationTrackingModel
                {
                    PersoId = user.PersoId,
                    LastResendRequestDate = _getCurrentTime()
                };
                await _sqlExecutor.InsertUserVerificationTrackingAsync(tracking);
            }

            // Step 4: Check daily limit and cooldown period
            var resendCheck = IsResendAllowed(tracking, currentTime, cooldownPeriod, dailyLimit);
            if (!resendCheck.IsAllowed)
            {
                _logger.LogWarning("Resend request limits reached for user {PersoId}.", user.PersoId);
                return resendCheck;
            }


            // Step 5: Check existing token, delete if expired
            var existingToken = await _sqlExecutor.GetUserVerificationTokenDataAsync(user.PersoId);
            if (existingToken != null && existingToken.TokenExpiryDate < currentTime)
            {
                int rowsDeleted = await _sqlExecutor.DeleteUserTokenByPersoidAsync(user.PersoId);
                if (rowsDeleted == 0)
                {
                    _logger.LogError("Failed to delete expired verification token for user {PersoId}.", user.PersoId);
                    throw new InvalidOperationException("Failed to delete expired verification token.");
                }
                _logger.LogInformation("Expired verification token deleted for user {PersoId}.", user.PersoId);
            }

            // Step 6: Generate and send token
            var isEmailSent = await _sendVerificationEmail(email);
            if (!isEmailSent)
            {
                _logger.LogError("Failed to send verification email for user {PersoId}.", user.PersoId);
                return (false, 500, "Failed to send verification email.");
            }
            _logger.LogInformation("Verification email sent for user {PersoId}.", user.PersoId);

            // Step 7: Update tracking info
            await UpdateTrackingInfo(tracking, currentTime);
            await _sqlExecutor.UpdateUserVerificationTrackingAsync(tracking);
            _logger.LogInformation("Tracking info updated for user {PersoId}.", user.PersoId);

            return (true, 200, "Verification email has been resent.");
        }
        private (bool IsAllowed, int StatusCode, string Message) IsResendAllowed(UserVerificationTrackingModel tracking, DateTime currentTime, TimeSpan cooldownPeriod, int dailyLimit)
        {
            if (tracking.LastResendRequestDate == currentTime.Date && tracking.DailyResendCount >= dailyLimit)
                return (false, 429, "Daily resend limit exceeded.");

            if (tracking.LastResendRequestTime.HasValue && (currentTime - tracking.LastResendRequestTime.Value) < cooldownPeriod)
                return (false, 429, "Please wait before requesting another verification email.");

            return (true, 200, "Resend allowed.");
        }
        private async Task UpdateTrackingInfo(UserVerificationTrackingModel tracking, DateTime currentTime)
        {
            tracking.LastResendRequestTime = currentTime;
            tracking.DailyResendCount = tracking.LastResendRequestDate == currentTime.Date ? tracking.DailyResendCount + 1 : 1;
            tracking.LastResendRequestDate = currentTime.Date;
            tracking.UpdatedAt = currentTime;
            await _sqlExecutor.UpdateUserVerificationTrackingAsync(tracking);
        }
        public async Task<bool> SendVerificationEmailAsync(string email)
        {
            return await _sendVerificationEmail(email);
        }
    }
}
