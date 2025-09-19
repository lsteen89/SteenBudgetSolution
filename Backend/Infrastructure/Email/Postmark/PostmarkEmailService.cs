using PostmarkDotNet;
using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Settings.Email;

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
        var m = composer.Compose(); // your MailMessage/MimeMessage → map fields
        var to = string.IsNullOrWhiteSpace(_overrideTo) ? m.To.ToString() : _overrideTo;

        var req = new PostmarkMessage
        {
            From = _from,
            To = to,
            Subject = m.Subject,
            HtmlBody = m.HtmlBody, // or map from your composer
            TextBody = m.TextBody,
            MessageStream = _stream,
            TrackOpens = false,
            Headers = _overrideTo is null ? null : new() {
                new("X-Original-To", m.To.ToString())
            }
        };

        if (_testMode) req.Headers ??= new(); // tag test mode (optional)
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
