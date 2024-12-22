using MimeKit;
using MailKit.Net.Smtp;
using Backend.Infrastructure.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Backend.Domain.Entities;
using Backend.Application.Interfaces.EmailServices;

/// <summary>
/// Base class for managing common email functionality across different controllers.
/// Provides foundational methods for sending and validating email requests.
/// </summary>

public abstract class EmailSenderBase : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailSenderBase> _logger;

    protected EmailSenderBase(IConfiguration configuration, ILogger<EmailSenderBase> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }
    public async Task<bool> TrySendEmailAsync(EmailMessageModel emailMessageModel)
    {
        try
        {
            // Configure email settings based on the type
            ConfigureEmailSettings(emailMessageModel);

            // Call method to handle sending email
            return await SendEmailAsync(emailMessageModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email of type {EmailType} to {Recipient}", emailMessageModel.EmailType, emailMessageModel.Recipient);
            return false;
        }
    }
    private void ConfigureEmailSettings(EmailMessageModel emailMessageModel)
    {
        switch (emailMessageModel.EmailType)
        {
            case EmailType.Verification:
                ConfigureVerificationEmailSettings(emailMessageModel);
                break;
            case EmailType.ContactUs:
                ConfigureContactUsEmailSettings(emailMessageModel);
                break;
            default:
                throw new InvalidOperationException("Unknown email type");
        }
    }
    private async Task<bool> SendEmailAsync(EmailMessageModel emailMessageModel)
    {
        MimeMessage emailMessage = BuildMimeMessage(emailMessageModel);

        try
        {
            using (var client = new SmtpClient())
            {
                _logger.LogInformation("Connecting to SMTP server at {Host}:{Port}", _configuration["Smtp:Host"], _configuration["Smtp:Port"]);
                await client.ConnectAsync(_configuration["Smtp:Host"], int.Parse(_configuration["Smtp:Port"]), MailKit.Security.SecureSocketOptions.StartTls);

                await client.AuthenticateAsync(emailMessageModel.Sender, emailMessageModel.SmtpPassword);
                await client.SendAsync(emailMessage);

                _logger.LogInformation("Email sent to {Recipient}", emailMessageModel.Recipient);
                await client.DisconnectAsync(true);
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {Recipient}", emailMessageModel.Recipient);
            return false;
        }
    }
    private MimeMessage BuildMimeMessage(EmailMessageModel emailMessageModel)
    {
        // Build the MimeMessage from the email message model
        var emailMessage = new MimeMessage();
        emailMessage.From.Add(new MailboxAddress(emailMessageModel.FromName, emailMessageModel.Sender));
        emailMessage.To.Add(new MailboxAddress(emailMessageModel.ToName, emailMessageModel.Recipient));

        if (!string.IsNullOrEmpty(emailMessageModel.ReplyTo))
        {
            emailMessage.ReplyTo.Add(new MailboxAddress("", emailMessageModel.ReplyTo));
        }

        emailMessage.Subject = emailMessageModel.Subject;
        emailMessage.Body = new TextPart("html") { Text = emailMessageModel.Body };

        return emailMessage;
    }
    // Method to configure settings for verification email
    private void ConfigureVerificationEmailSettings(EmailMessageModel emailMessageModel)
    {
        emailMessageModel.Sender = _configuration["Smtp:UsernameNoReply"];
        emailMessageModel.FromName = "No Reply";
        emailMessageModel.SmtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? _configuration["Smtp:Password"];
    }

    private void ConfigureContactUsEmailSettings(EmailMessageModel emailMessageModel)
    {
        emailMessageModel.Sender = _configuration["Smtp:UsernameInfoUser"];
        emailMessageModel.FromName = "eBudget Support";
        emailMessageModel.SmtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD_INFO") ?? _configuration["Smtp:Password"];
    }
}
