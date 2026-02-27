using Backend.Application.Abstractions.Infrastructure.Email;
using MimeKit;

namespace Backend.Infrastructure.Email.Composers;

public sealed class OutboxEmailComposer : IEmailComposer
{
    private readonly string _to;
    private readonly string _subject;
    private readonly string _bodyHtml;
    private readonly string _fromAddress;
    private readonly string _fromName;

    public OutboxEmailComposer(
        string to,
        string subject,
        string bodyHtml,
        string fromAddress,
        string fromName)
    {
        _to = to;
        _subject = subject;
        _bodyHtml = bodyHtml;
        _fromAddress = fromAddress;
        _fromName = fromName;
    }

    public MimeMessage Compose()
    {
        var msg = new MimeMessage();

        msg.From.Add(new MailboxAddress(_fromName, _fromAddress));
        msg.To.Add(MailboxAddress.Parse(_to));
        msg.Subject = _subject;

        var builder = new BodyBuilder
        {
            HtmlBody = _bodyHtml
        };

        msg.Body = builder.ToMessageBody();
        return msg;
    }
}
