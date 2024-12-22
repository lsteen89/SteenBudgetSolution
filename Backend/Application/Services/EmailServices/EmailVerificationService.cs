using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Settings;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Email;
using Microsoft.Extensions.Options;
using System.Net.Mail;

public class EmailVerificationService: IEmailVerificationService
{
    private readonly IUserSqlExecutor _userSqlExecutor;
    private readonly IUserTokenService _userTokenService;
    private readonly IEmailService _emailService;
    private readonly ILogger<EmailVerificationService> _logger;
    private readonly Func<DateTime> _getCurrentTime;
    private readonly ResendEmailSettings _settings;
    IEmailPreparationService emailPreparationService;

    public EmailVerificationService(
        IUserSqlExecutor userSqlExecutor,
        IUserTokenService userTokenService,
        IEmailService emailService,
        IOptions<ResendEmailSettings> options,
        ILogger<EmailVerificationService> logger,
        IEmailPreparationService emailPreparationService,
        Func<DateTime> getCurrentTime = null)
    {
        _userSqlExecutor = userSqlExecutor;
        _userTokenService = userTokenService;
        _emailService = emailService;
        _getCurrentTime = getCurrentTime ?? (() => DateTime.UtcNow);
        _settings = options.Value;
        _logger = logger;
        this.emailPreparationService = emailPreparationService;
    }

    public async Task<bool> SendVerificationEmailWithTokenAsync(string email)
    {
        var result = await HandleVerificationEmailAsync(email, isResend: false);
        return result.IsSuccess;
    }

    public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
    {
        var result = await HandleVerificationEmailAsync(email, isResend: true);
        return result;
    }
    private async Task<(bool IsSuccess, int StatusCode, string Message)> HandleVerificationEmailAsync(string email, bool isResend)
    {
        var currentTime = _getCurrentTime();
        var cooldownPeriod = TimeSpan.FromMinutes(_settings.CooldownPeriodMinutes);
        var dailyLimit = _settings.DailyLimit;

        var user = await CheckUserExistsAsync(email);
        if (user == null) return (false, 404, "User not found.");

        var tracking = await GetOrInitializeTrackingAsync(user.PersoId);

        // Apply resend logic to both initial and resend scenarios:
        var resendCheck = IsResendAllowed(tracking, currentTime, cooldownPeriod, dailyLimit);
        if (!resendCheck.IsAllowed)
            return (false, resendCheck.StatusCode, resendCheck.Message);

        var tokenDeleted = await CheckAndDeleteExpiredTokenAsync(user.PersoId, currentTime);
        if (!tokenDeleted)
            throw new InvalidOperationException("Failed to delete expired verification token.");

        // Generate and store a new token
        var tokenModel = await _userTokenService.CreateEmailTokenAsync(user.PersoId);
        var tokenInserted = await _userTokenService.InsertUserTokenAsync(tokenModel);
        if (!tokenInserted)
            throw new InvalidOperationException("Failed to save the new verification token.");

        // Send the email
        var emailMessage = PrepareVerificationMessage(user.Email, tokenModel.Token);
        var emailSent = await _emailService.ProcessAndSendEmailAsync(emailMessage);
        if (!emailSent)
            return (false, 500, "Failed to send verification email.");

        await UpdateTrackingInfo(tracking, currentTime);

        // Different message depending on initial or resend
        var message = isResend ? "Verification email has been resent." : "Verification email sent.";
        return (true, 200, message);
    }
    private async Task<UserModel?> CheckUserExistsAsync(string email)
    {
        var user = await _userSqlExecutor.GetUserModelAsync(email: email);
        if (user == null) _logger.LogWarning("User not found for email: {Email}", email);
        return user;
    }

    private async Task<UserVerificationTrackingModel> GetOrInitializeTrackingAsync(Guid persoId)
    {
        var tracking = await _userTokenService.GetUserVerificationTrackingAsync(persoId);
        if (tracking == null)
        {
            tracking = new UserVerificationTrackingModel
            {
                PersoId = persoId,
                LastResendRequestDate = _getCurrentTime()
            };
            await _userTokenService.InsertUserVerificationTrackingAsync(tracking);
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
        var existingToken = await _userTokenService.GetUserVerificationTokenByPersoIdAsync(persoId);
        if (existingToken != null && existingToken.TokenExpiryDate < currentTime)
        {
            int rowsDeleted = await _userTokenService.DeleteUserTokenByPersoidAsync(persoId);
            if (rowsDeleted == 0)
            {
                _logger.LogError("Failed to delete expired verification token for user {PersoId}.", persoId);
                return false;
            }
            _logger.LogInformation("Expired verification token deleted for user {PersoId}.", persoId);
        }
        return true;
    }

    private async Task UpdateTrackingInfo(UserVerificationTrackingModel tracking, DateTime currentTime)
    {
        tracking.LastResendRequestTime = currentTime;
        tracking.DailyResendCount = tracking.LastResendRequestDate == currentTime.Date ? tracking.DailyResendCount + 1 : 1;
        tracking.LastResendRequestDate = currentTime.Date;
        tracking.UpdatedAt = currentTime;
        await _userTokenService.UpdateUserVerificationTrackingAsync(tracking);
    }
    private EmailMessageModel PrepareVerificationMessage(string email, Guid Token)
    {
        var emailMessage = new EmailMessageModel
        {
            Recipient = email,
            EmailType = EmailType.Verification,
            Token = Token
        };
        return emailMessage;
    }
}
