using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Polly;
using Polly.Retry;
using Backend.Application.Interfaces.Email;
using System.Net.Sockets;
using Backend.Settings.Email;

namespace Backend.Infrastructure.Email
{
    public class EmailService : IEmailService
    {
        private readonly SmtpSettings _settings;
        private readonly ILogger<EmailService> _logger;
        private readonly AsyncRetryPolicy _retryPolicy;

        public EmailService(IOptions<SmtpSettings> settings, ILogger<EmailService> logger)
        {
            _settings = settings.Value;
            _logger = logger;

            if (string.IsNullOrEmpty(_settings.Host) || _settings.Port <= 0)
            {
                throw new ArgumentException("SMTP settings are not properly configured.");
            }

            _retryPolicy = Policy
                .Handle<SmtpCommandException>() // Specific MailKit command error
                .Or<SocketException>()         // Network-level error
                .Or<IOException>()             // I/O error
                .WaitAndRetryAsync(3, 
                    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))  // Base delay
                                  + TimeSpan.FromMilliseconds(new Random().Next(0, 500)), // Jitter
                    (exception, timeSpan, retryCount, context) =>
                    {
                        _logger.LogWarning(
                            exception,
                            "Email send failed. Retry attempt {RetryCount}/{MaxRetries}. Retrying in {DelaySeconds:0.00} seconds.",
                            retryCount,
                            3, // Max retries
                            timeSpan.TotalSeconds);
                    });
        }

        public async Task SendEmailAsync(string toAddress, string subject, string body)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
            message.To.Add(MailboxAddress.Parse(toAddress));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = body };

            await _retryPolicy.ExecuteAsync(async () =>
            {
                using var client = new SmtpClient();
                try
                {
                    // Use cancellation tokens for better control
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                    await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.StartTls, cts.Token);
                    await client.AuthenticateAsync(_settings.User, _settings.Password, cts.Token);
                    await client.SendAsync(message, cts.Token);
                    _logger.LogInformation("Email sent successfully to {ToAddress}", toAddress);
                }
                finally
                {
                    if (client.IsConnected)
                    {
                        await client.DisconnectAsync(true);
                    }
                }
            });
        }
    }
}