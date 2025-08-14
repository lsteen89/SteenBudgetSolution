using Backend.Application.Abstractions.Infrastructure.Email;
using MimeKit;
using Backend.Application.Options.URL;
using Backend.Settings.Email;
using Microsoft.AspNetCore.WebUtilities;

public class VerificationEmailComposer : IEmailComposer
{
    private readonly AppUrls _urlSettings;
    private readonly SmtpSettings _emailSettings;
    private readonly string _recipientEmail;
    private readonly Guid _token;

    public VerificationEmailComposer(AppUrls urlSettings, SmtpSettings emailSettings, string recipientEmail, Guid token)
    {
        _urlSettings = urlSettings; _emailSettings = emailSettings;
        _recipientEmail = recipientEmail; _token = token;
    }

    public MimeMessage Compose()
    {
        var url = QueryHelpers.AddQueryString(_urlSettings.VerifyUrl, "token", _token.ToString("N"));

        var subject = "Email Verification - Confirm your email address";
        var html = $"""
            <h1>Welcome to eBudget!</h1>
            <p>Please click the link below to confirm your email address:</p>
            <p><a href="{url}"><strong>Confirm My Email</strong></a></p>
            """;
        var text = $"Welcome to eBudget!\nConfirm your email: {url}";

        var msg = new MimeMessage();
        msg.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromAddress));
        msg.To.Add(MailboxAddress.Parse(_recipientEmail));
        msg.Subject = subject;

        // Prefer multipart/alternative for deliverability
        var body = new Multipart("alternative")
        {
            new TextPart("plain") { Text = text },
            new TextPart("html")  { Text = html }
        };
        msg.Body = body;
        return msg;
    }
}