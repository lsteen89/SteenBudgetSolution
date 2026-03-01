using Backend.Application.Abstractions.Infrastructure.Email;

namespace Backend.IntegrationTests.E2E.Helpers;

public sealed record CapturedEmail(string To, string Subject, string BodyHtml);

public interface IEmailCapture
{
    void Add(CapturedEmail email);
    IReadOnlyList<CapturedEmail> All();
    CapturedEmail? LastTo(string to);
}

public sealed class InMemoryEmailCapture : IEmailCapture
{
    private readonly List<CapturedEmail> _items = new();
    private readonly object _gate = new();

    public void Add(CapturedEmail email)
    {
        lock (_gate) _items.Add(email);
    }

    public IReadOnlyList<CapturedEmail> All()
    {
        lock (_gate) return _items.ToList();
    }

    public CapturedEmail? LastTo(string to)
    {
        lock (_gate)
            return _items.LastOrDefault(x =>
                x.To.Equals(to, StringComparison.OrdinalIgnoreCase));
    }
}

public sealed class InMemoryEmailService : IEmailService
{
    private readonly IEmailCapture _capture;

    public InMemoryEmailService(IEmailCapture capture) => _capture = capture;

    public Task<EmailSendResult> SendEmailAsync(IEmailComposer composer, CancellationToken ct)
    {
        var m = composer.Compose();
        var to = m.To.Mailboxes.FirstOrDefault()?.Address ?? "";
        _capture.Add(new CapturedEmail(to, m.Subject, m.HtmlBody ?? ""));
        return Task.FromResult(new EmailSendResult(true, "InMemory", null));
    }
}