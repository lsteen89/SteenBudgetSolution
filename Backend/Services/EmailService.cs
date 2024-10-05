using MimeKit;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public void SendVerificationEmail(string email, string token)
    {
        var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/verify-email?token={token}";

        using (var emailMessage = new MimeMessage())
        {
            emailMessage.From.Add(new MailboxAddress("No Reply", _configuration["Smtp:Username"]));
            emailMessage.To.Add(new MailboxAddress("", email));
            emailMessage.Subject = "Email Verification";
            emailMessage.Body = new TextPart("html")
            {
                Text = $"Please verify your email by clicking the following link: <a href='{verificationUrl}'>Verify Email</a>"
            };

            try
            {
                _logger.LogInformation("Attempting to send verification email to {Email}", email);

                using (var client = new SmtpClient())
                {
                    client.Connect(_configuration["Smtp:Host"], int.Parse(_configuration["Smtp:Port"]), MailKit.Security.SecureSocketOptions.StartTls);
                    client.Authenticate(_configuration["Smtp:Username"], _configuration["Smtp:Password"]);
                    client.Send(emailMessage);
                    client.Disconnect(true);
                }

                _logger.LogInformation("Verification email sent to {Email}", email);
            }
            catch (Exception ex)
            {
                // Log the exception with Serilog
                _logger.LogError(ex, "Error sending verification email to {Email}", email);
                throw; // Optional: rethrow the exception or handle it accordingly
            }
        }
    }
}
