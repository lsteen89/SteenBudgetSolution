using Backend.DataAccess;
using Backend.Models;

namespace Backend.Helpers
{
    public class UserVerificationHelper
    {
        private readonly SqlExecutor _sqlExecutor;
        private readonly IEmailService _emailService;

        public UserVerificationHelper(SqlExecutor sqlExecutor, IEmailService emailService)
        {
            _sqlExecutor = sqlExecutor;
            _emailService = emailService;
        }

        public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
        {
            // Step 1: Check if the user exists
            var user = await _sqlExecutor.GetUserForRegistrationAsync(null, email);
            if (user == null)
                return (false, 404, "User not found.");

            // Step 2: Fetch or initialize tracking info for this user
            var tracking = await _sqlExecutor.GetUserVerificationTrackingAsync(user.PersoId);
            if (tracking == null)
            {
                // Initialize tracking if it doesn’t exist
                tracking = new UserVerificationTracking
                {
                    PersoId = user.PersoId,
                    LastResendRequestTime = null,
                    DailyResendCount = 0,
                    LastResendRequestDate = DateTime.UtcNow.Date
                };
                await _sqlExecutor.InsertUserVerificationTrackingAsync(tracking);
            }

            var currentTime = DateTime.UtcNow;
            var cooldownPeriod = TimeSpan.FromMinutes(15);
            var dailyLimit = 3;

            // Step 3: Check daily limit and cooldown period
            if (tracking.LastResendRequestDate == currentTime.Date && tracking.DailyResendCount >= dailyLimit)
                return (false, 429, "Daily resend limit exceeded.");

            if (tracking.LastResendRequestTime.HasValue && (currentTime - tracking.LastResendRequestTime.Value) < cooldownPeriod)
                return (false, 429, "Please wait before requesting another verification email.");

            // Step 4: Generate or retrieve the verification token
            var token = await _sqlExecutor.GetUserVerificationTokenAsync(user.PersoId.ToString());

            // Step 5: Send verification email
            await _emailService.SendVerificationEmailAsync(user.Email, token);

            // Step 6: Update tracking info
            tracking.LastResendRequestTime = currentTime;
            tracking.DailyResendCount = tracking.LastResendRequestDate == currentTime.Date ? tracking.DailyResendCount + 1 : 1;
            tracking.LastResendRequestDate = currentTime.Date;
            tracking.UpdatedAt = currentTime;

            await _sqlExecutor.UpdateUserVerificationTrackingAsync(tracking);

            return (true, 200, "Verification email has been resent.");
        }
    }
}
