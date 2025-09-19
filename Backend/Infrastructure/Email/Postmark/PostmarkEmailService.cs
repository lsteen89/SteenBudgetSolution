using PostmarkDotNet;
using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Settings.Email;
using MimeKit;

namespace Backend.Infrastructure.Email.Postmark;

public sealed class PostmarkEmailService : IEmailService
{
    private readonly PostmarkClient _client;
    private readonly string _from;
    private readonly string? _overrideTo;
    private readonly string _stream;
    private readonly bool _testMode;
    private readonly ILogger<PostmarkEmailService> _log;

    public PostmarkEmailService(IOptionsMonitor<PostmarkOptions> pm,
                                IOptions<SmtpSettings> smtp,
                                ILogger<PostmarkEmailService> log)
    {
        var p = pm.CurrentValue;
        _client = new PostmarkClient(p.ServerToken);
        _from = p.From ?? smtp.Value.FromAddress;
        _overrideTo = (Environment.GetEnvironmentVariable("Email__OverrideTo")
                      ?? (pm as IOptions<PostmarkOptions>)?.Value?.OverrideTo);
        _stream = p.MessageStream ?? "outbound";
        _testMode = p.TestMode;
        _log = log;
    }

    public async Task<EmailSendResult> SendEmailAsync(IEmailComposer composer, CancellationToken ct)
    {
        var m = composer.Compose();

        // Extract pure email addresses (avoids formatting surprises)
        static string JoinAddresses(InternetAddressList list) =>
            string.Join(",", list.Mailboxes.Select(x => x.Address));

        var to = string.IsNullOrWhiteSpace(_overrideTo)
            ? JoinAddresses(m.To)
            : _overrideTo;

        var replyTo = m.ReplyTo?.Mailboxes?.Any() == true
            ? JoinAddresses(m.ReplyTo)
            : null;

        _log.LogInformation("Postmark From={From} To={To} ReplyTo={ReplyTo} Stream={Stream}",
            _from, to, replyTo ?? "(none)", _stream);

        var req = new PostmarkMessage
        {
            From = _from,                 // MUST be verified at Postmark
            To = to,
            Subject = m.Subject,
            HtmlBody = m.HtmlBody,
            TextBody = m.TextBody,
            ReplyTo = replyTo,            // <-- important
            MessageStream = _stream ?? "outbound",
            TrackOpens = false,
            Headers = _overrideTo is null ? null : new() { new("X-Original-To", JoinAddresses(m.To)) }
        };

        var resp = await _client.SendMessageAsync(req);
        var ok = resp.Status == PostmarkStatus.Success;
        if (!ok) _log.LogWarning("Postmark send failed: {Code} {Msg}", resp.ErrorCode, resp.Message);
        else _log.LogInformation("Postmark sent: {Id}", resp.MessageID);

        return new EmailSendResult(ok, ok ? resp.MessageID.ToString() : null, ok ? null : resp.Message);
    }
}

public class PostmarkOptions
{
    public string ServerToken { get; set; } = "";
    public string From { get; set; } = "";
    public string MessageStream { get; set; } = "outbound";
    public bool TestMode { get; set; }
    public string? OverrideTo { get; set; }
}
