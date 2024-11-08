using Backend.DataAccess;
using Backend.Models;
using Backend.Services;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Helpers
{
    public class UserVerificationHelper
    {
        private readonly SqlExecutor _sqlExecutor;
        private readonly IEmailService _emailService;
        private readonly UserServices _userService;

        // Mockable time provider
        private readonly Func<DateTime> _getCurrentTime;
        private readonly ResendEmailSettings _settings;

        public UserVerificationHelper(SqlExecutor sqlExecutor, IEmailService emailService, IOptions<ResendEmailSettings> options, UserServices userService, Func<DateTime> getCurrentTime = null)
        {
            _sqlExecutor = sqlExecutor;
            _emailService = emailService;
            _getCurrentTime = getCurrentTime ?? (() => DateTime.UtcNow); // Default to UtcNow if no mock time is provided
            _settings = options.Value;
            _userService = userService;
        }

        public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
        {
            // step 1: Fetch settings
            var currentTime = _getCurrentTime();
            var cooldownPeriod = TimeSpan.FromMinutes(_settings.CooldownPeriodMinutes);
            var dailyLimit = _settings.DailyLimit;

            // Step 2: Check if the user exists
            var user = await _sqlExecutor.GetUserModelAsync(email: email);
            if (user == null)
                return (false, 404, "User not found.");

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

            // Step 3: Check daily limit and cooldown period
            var resendCheck = IsResendAllowed(tracking, currentTime, cooldownPeriod, dailyLimit);
            if (!resendCheck.IsAllowed)
                return resendCheck;

            // Step 4: Generate and send token
            var isEmailSent = await _userService.SendVerificationEmailWithTokenAsync(email); 
            if (!isEmailSent)
                return (false, 500, "Failed to send verification email.");

            // Step 6: Update tracking info
            await UpdateTrackingInfo(tracking, currentTime);
            await _sqlExecutor.UpdateUserVerificationTrackingAsync(tracking);

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
    }
}
