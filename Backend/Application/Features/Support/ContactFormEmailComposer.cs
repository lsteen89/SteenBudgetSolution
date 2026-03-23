using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Settings.Email;
using MimeKit;
using System.Text.Encodings.Web;

namespace Backend.Application.Features.Contact;

public class ContactFormEmailComposer : IEmailComposer
{
    private readonly SmtpSettings _settings;
    private readonly string _fromAddress;
    private readonly string _subject;
    private readonly string _body;

    public ContactFormEmailComposer(SmtpSettings settings, string fromAddress, string subject, string body)
    {
        _settings = settings;
        _fromAddress = fromAddress;
        _subject = subject;
        _body = body;
    }

    public MimeMessage Compose()
    {
        if (string.IsNullOrWhiteSpace(_settings.FromAddress))
            throw new InvalidOperationException("Smtp.FromAddress is not configured.");

        // Where to deliver contact messages (fallback to FromAddress if not set)
        var toAddress = string.IsNullOrWhiteSpace(_settings.ContactRecipient)
            ? _settings.FromAddress
            : _settings.ContactRecipient!;

        var safeFrom = HtmlEncoder.Default.Encode(_fromAddress);
        var safeBody = HtmlEncoder.Default.Encode(_body).Replace("\n", "<br/>");

        var msg = new MimeMessage();

        // Use ctor (no parsing) for known config addresses
        msg.From.Add(new MailboxAddress(_settings.FromName ?? "Ebudget", _settings.FromAddress));
        msg.To.Add(new MailboxAddress("", toAddress));

        // Sender email comes from user input; your validator already checks it,
        // so Parse is fine here. If you want extra safety, use TryParse and handle false.
        msg.ReplyTo.Add(MailboxAddress.Parse(_fromAddress));

        msg.Subject = $"Contact Form: {_subject}";

        msg.Body = new Multipart("alternative")
        {
            new TextPart("plain") { Text = $"From: {_fromAddress}\n\n{_body}" },
            new TextPart("html")  { Text = $"<b>Message from:</b> {safeFrom}<br/><hr/>{safeBody}" }
        };

        return msg;
    }
}