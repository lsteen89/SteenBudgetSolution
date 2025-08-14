using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Settings.Email;
using Microsoft.Extensions.Options;
using Backend.Domain.Users;

namespace Backend.Application.Features.Contact;

public sealed class SendContactFormHandler : ICommandHandler<SendContactFormCommand, Result>
{
    private readonly IRecaptchaService _recaptchaService;
    private readonly IEmailService _emailService;
    private readonly IEmailRateLimiter _rateLimiter;
    private readonly ITimeProvider _clock;
    private readonly IOptions<SmtpSettings> _smtpSettings;
    private readonly ILogger<SendContactFormHandler> _logger;
    private readonly bool _allowTestEmails;

    public SendContactFormHandler(
        IRecaptchaService recaptchaService,
        IEmailService emailService,
        IEmailRateLimiter rateLimiter,
        ITimeProvider clock,
        IOptions<SmtpSettings> smtpSettings,
        ILogger<SendContactFormHandler> logger,
        IConfiguration configuration)
    {
        _recaptchaService = recaptchaService;
        _emailService = emailService;
        _rateLimiter = rateLimiter;
        _clock = clock;
        _smtpSettings = smtpSettings;
        _logger = logger;
        _allowTestEmails = configuration.GetValue<bool>("AllowTestEmails");
    }

    public async Task<Result> Handle(SendContactFormCommand request, CancellationToken ct)
    {
        // 0) Basic validation
        if (string.IsNullOrWhiteSpace(request.SenderEmail) ||
            string.IsNullOrWhiteSpace(request.Subject) ||
            string.IsNullOrWhiteSpace(request.Body) ||
            request.Subject.Length > 200 || request.Body.Length > 4000)
            return Result.Failure(UserErrors.ValidationFailed);

        // 1) CAPTCHA
        bool isTestBypass = _allowTestEmails && request.SenderEmail == "l@l.se";
        if (!isTestBypass && !await _recaptchaService.ValidateTokenAsync(request.CaptchaToken))
        {
            _logger.LogWarning("Invalid reCAPTCHA for email: {Email}", request.SenderEmail);
            return Result.Failure(UserErrors.InvalidCaptcha);
        }

        // 2) Rate limiting (per email + per IP)
        var now = _clock.UtcNow;
        var emailNorm = request.SenderEmail.Trim().ToLowerInvariant();
        var ip = string.IsNullOrWhiteSpace(request.IpAddress) ? "unknown" : request.IpAddress;

        var keyPerEmail = $"contact:{emailNorm}";
        var keyPerIp = $"contact-ip:{ip}";

        var emailDecision = await _rateLimiter.CheckAsync(keyPerEmail, EmailKind.Contact, ct);
        var ipDecision = await _rateLimiter.CheckAsync(keyPerIp, EmailKind.Contact, ct);
        if (!emailDecision.Allowed || !ipDecision.Allowed)
        {
            _logger.LogInformation("Contact form rate-limited. Email={Email} IP={IP}", emailNorm, ip);
            return Result.Success(); // silent throttle
        }

        // 3) Send
        try
        {
            _logger.LogInformation("Sending contact form email from {Email}", emailNorm);

            var composer = new ContactFormEmailComposer(
                _smtpSettings.Value, emailNorm, request.Subject, request.Body);

            var emailResult = await _emailService.SendEmailAsync(composer, ct);
            if (!emailResult.Success)
            {
                _logger.LogError("Email service failed to send contact email: {Error}", emailResult.Error);
                return Result.Failure(UserErrors.EmailSendFailed);
            }

            // 4) Mark sent
            await _rateLimiter.MarkSentAsync(keyPerEmail, EmailKind.Contact, now, ct);
            await _rateLimiter.MarkSentAsync(keyPerIp, EmailKind.Contact, now, ct);

            _logger.LogInformation("Contact form email sent from {Email}", emailNorm);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception sending contact form email from {Email}", emailNorm);
            return Result.Failure(UserErrors.EmailSendFailed);
        }
    }
}
