using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Retry;
using Backend.Application.Abstractions.Infrastructure.Email;
using System.Net.Sockets;
using Backend.Settings.Email;

namespace Backend.Infrastructure.Email;

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

    public async Task<EmailSendResult> SendEmailAsync(IEmailComposer composer, CancellationToken ct)
    {
        // 1. Get the pre-built message from the composer.
        var message = composer.Compose();

        try
        {
            await _retryPolicy.ExecuteAsync(async (cancellationToken) =>
            {
                using var client = new SmtpClient();
                try
                {
                    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                    linkedCts.CancelAfter(TimeSpan.FromSeconds(30));

                    await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.StartTls, linkedCts.Token);
                    await client.AuthenticateAsync(_settings.User, _settings.Password, linkedCts.Token);

                    // The 'message' object is now the one we received from the composer
                    await client.SendAsync(message, linkedCts.Token);

                    // <-- Updated logging to use the message object
                    _logger.LogInformation("Email sent successfully to {ToAddress}", message.To);
                }
                finally
                {
                    if (client.IsConnected)
                    {
                        await client.DisconnectAsync(true, CancellationToken.None);
                    }
                }
            }, ct);

            return new EmailSendResult(true, "LocalSmtpSuccess", null);
        }
        catch (Exception ex)
        {
            // <-- Updated logging to use the message object
            _logger.LogError(ex, "Failed to send email to {ToAddress} after all retries.", message.To);
            return new EmailSendResult(false, null, ex.Message);
        }
    }
}