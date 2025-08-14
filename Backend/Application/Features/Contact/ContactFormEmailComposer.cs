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
        var safeFrom = HtmlEncoder.Default.Encode(_fromAddress);
        var safeBody = HtmlEncoder.Default.Encode(_body).Replace("\n", "<br/>");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
        message.To.Add(MailboxAddress.Parse(_settings.FromAddress));
        message.ReplyTo.Add(MailboxAddress.Parse(_fromAddress));
        message.Subject = $"Contact Form: {_subject}";

        var text = $"From: {_fromAddress}\n\n{_body}";
        var html = $"<b>Message from:</b> {safeFrom}<br/><hr/>{safeBody}";

        message.Body = new Multipart("alternative")
        {
            new TextPart("plain") { Text = text },
            new TextPart("html")  { Text = html  }
        };
        return message;
    }
}