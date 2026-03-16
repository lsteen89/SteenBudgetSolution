namespace Backend.Application.Features.Support.Contact;

public sealed class SendSupportMessageRequest
{
    public string Subject { get; init; } = default!;
    public string Body { get; init; } = default!;
    public string? Category { get; init; }
}