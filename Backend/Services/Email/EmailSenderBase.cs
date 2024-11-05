using MimeKit;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

/// <summary>
/// Base class for managing common email functionality across different controllers.
/// Provides foundational methods for sending and validating email requests.
/// </summary>

public interface IEmailSender
{
    Task SendEmailAsync(string recipient, string subject, string body);
}

public abstract class EmailSenderBase : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailSenderBase> _logger;

    protected EmailSenderBase(IConfiguration configuration, ILogger<EmailSenderBase> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string recipient, string subject, string body)
    {
        var emailMessage = new MimeMessage();
        emailMessage.From.Add(new MailboxAddress("No Reply", _configuration["Smtp:UsernameNoReply"])); // Using no-reply@ebudget.se 
        emailMessage.To.Add(new MailboxAddress("", recipient));
        emailMessage.Subject = subject;
        emailMessage.Body = new TextPart("html") { Text = body };

        try
        {
            using (var client = new SmtpClient())
            {
                _logger.LogInformation("Connecting to SMTP server at {Host}:{Port}", _configuration["Smtp:Host"], _configuration["Smtp:Port"]);

                await client.ConnectAsync(_configuration["Smtp:Host"], int.Parse(_configuration["Smtp:Port"]), MailKit.Security.SecureSocketOptions.StartTls);

                var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? _configuration["Smtp:Password"];
                await client.AuthenticateAsync(_configuration["Smtp:UsernameNoReply"], smtpPassword);

                await client.SendAsync(emailMessage);
                _logger.LogInformation("Email sent to {Recipient}", recipient);

                await client.DisconnectAsync(true);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {Recipient}", recipient);
            throw;
        }
    }
    public async Task SendContactEmail(string subject, string body, string senderEmail)
    {
        var emailMessage = new MimeMessage();
        emailMessage.From.Add(new MailboxAddress("No Reply", _configuration["Smtp:UsernameNoReply"])); // Using no-reply@ebudget.se 

        var recipient = _configuration["Smtp:UsernameInfoUser"];    // info@mail.ebudget.se
        emailMessage.To.Add(new MailboxAddress("eBudget Support", recipient));

        emailMessage.ReplyTo.Add(new MailboxAddress("", senderEmail));
        emailMessage.Subject = subject;
        emailMessage.Body = new TextPart("html")
        {
            Text = $"<p><strong>From:</strong> {senderEmail}</p><p>{body}</p>"
        };

        try
        {
            using (var client = new SmtpClient())
            {
                _logger.LogInformation("Connecting to SMTP server at {Host}:{Port}", _configuration["Smtp:Host"], _configuration["Smtp:Port"]);

                await client.ConnectAsync(_configuration["Smtp:Host"], int.Parse(_configuration["Smtp:Port"]), MailKit.Security.SecureSocketOptions.StartTls);

                // Fetching the password from the environment variable specifically for `info@ebudget.se`
                var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD_INFO") ?? _configuration["Smtp:Password"];
                _logger.LogInformation("Send mail from {Host}:{Port} to {Recipient}", _configuration["Smtp:Host"], _configuration["Smtp:Port"], _configuration["Smtp:UsernameInfoUser"]);
                await client.AuthenticateAsync(_configuration["Smtp:UsernameInfoUser"], smtpPassword);

                await client.SendAsync(emailMessage);
                _logger.LogInformation("Email sent to {Recipient}", _configuration["Smtp:UsernameInfoUser"]);

                await client.DisconnectAsync(true);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email to {Recipient} from {SenderMail}", _configuration["Smtp:UsernameInfoUser"], senderEmail);
            throw;
        }
    }

}
