using MimeKit;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Configuration;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public void SendVerificationEmail(string email, string token)
    {
        var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/verify-email?token={token}";

        var emailMessage = new MimeMessage();
        emailMessage.From.Add(new MailboxAddress("No Reply", _configuration["Smtp:Username"]));
        emailMessage.To.Add(new MailboxAddress("", email));
        emailMessage.Subject = "Email Verification";
        emailMessage.Body = new TextPart("html")
        {
            Text = $"Please verify your email by clicking the following link: <a href='{verificationUrl}'>Verify Email</a>"
        };

        using (var client = new SmtpClient())
        {
            client.Connect(_configuration["Smtp:Host"], int.Parse(_configuration["Smtp:Port"]), MailKit.Security.SecureSocketOptions.StartTls);
            client.Authenticate(_configuration["Smtp:Username"], _configuration["Smtp:Password"]);
            client.Send(emailMessage);
            client.Disconnect(true);
        }
    }
}
