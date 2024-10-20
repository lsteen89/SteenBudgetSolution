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
        // Generate the verification URL
        //var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/api/Registration/verify-email?token={token}";
        var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/verify-email/{token}";
        // Log the generated verification URL
        _logger.LogInformation("Generated verification URL: {VerificationUrl}", verificationUrl);

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
                    _logger.LogInformation("Connecting to SMTP server {Host} on port {Port}",
                        _configuration["Smtp:Host"], _configuration["Smtp:Port"]);

                    client.Connect(_configuration["Smtp:Host"], int.Parse(_configuration["Smtp:Port"]!), MailKit.Security.SecureSocketOptions.StartTls);
                    _logger.LogInformation("SMTP connection established.");

                    _logger.LogInformation("THIS IS A TEST TO ENSURE PROPER BUILD IS PERFORMED\n\n##TEST##\n\n");

                    // Fetch the SMTP password from the environment variable (if set) or fallback to the config file
                    var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD")
                        ?? _configuration["Smtp:Password"];

                    // Authenticate
                    _logger.LogInformation("Authenticating as {Username}", _configuration["Smtp:Username"]);
                    client.Authenticate(_configuration["Smtp:Username"], smtpPassword);
                    _logger.LogInformation("SMTP authentication successful.");

                    // Send the email
                    client.Send(emailMessage);
                    _logger.LogInformation("Verification email sent to {Email}", email);

                    // Disconnect
                    client.Disconnect(true);
                    _logger.LogInformation("SMTP connection closed.");
                }
            }
            catch (Exception ex)
            {
                // Log detailed error
                _logger.LogError(ex, "Error sending verification email to {Email}. SMTP Host: {Host}, Port: {Port}",
                    email, _configuration["Smtp:Host"], _configuration["Smtp:Port"]);
                throw; // Optional rethrow for further handling
            }
        }
    }
}
