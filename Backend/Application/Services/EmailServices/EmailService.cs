using System.Net.Mail;
using Backend.Infrastructure.Email;
using Backend.Domain.Entities;
using Backend.Application.DTO;

/// <summary>
/// Manages the flow of email preparation and sending based on email type.
/// Provides configuration and logging for both verification and contact emails.
/// </summary>
public class EmailService : EmailSenderBase, IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    EmailPreparationService emailPreparationService;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, EmailPreparationService emailPreparationService)
        : base(configuration, logger)
    {
        _configuration = configuration;
        _logger = logger;
        this.emailPreparationService = emailPreparationService;
    }
    public async Task<bool> ProcessAndSendEmailAsync(EmailMessageModel emailMessage)
    {
        try
        {

            switch (emailMessage.EmailType)
            {
                // Determine the type of email and prepare it accordingly
                case EmailType.Verification:
                    emailMessage = await emailPreparationService.PrepareVerificationEmailAsync(emailMessage);
                    break;
                case EmailType.ContactUs:
                    emailMessage = await emailPreparationService.PrepareContactUsEmailAsync(emailMessage);
                    break;
                default:
                    throw new InvalidOperationException("Unknown email type");
            }
            // Call SendEmailAsync with the details from EmailMessage
            bool emailSent = await TrySendEmailAsync(emailMessage);
            if (emailSent)
            {
                _logger.LogInformation("Email sent successfully to: {Email}", emailMessage.Recipient);
                return true;
            }
            else
            {
                _logger.LogError("Failed to send email to: {Email}", emailMessage.Recipient);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while processing email for: {Email}", emailMessage.Recipient);
            return false;
        }

    }
    public async Task<bool> SendContactUsEmail (string subject, string body, string SenderEmail)
    {
        EmailMessageModel emailMessageModel = new EmailMessageModel
        {
            Subject = subject,
            Body = body,
            FromName = SenderEmail,
            EmailType = EmailType.ContactUs
        };
        return await ProcessAndSendEmailAsync(emailMessageModel);
    }
}
