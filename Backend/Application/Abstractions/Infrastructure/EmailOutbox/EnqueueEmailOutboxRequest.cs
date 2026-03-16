namespace Backend.Application.Abstractions.Infrastructure.EmailOutbox;

public sealed record EnqueueEmailOutboxRequest(
    string Kind,
    string ToEmail,
    string Subject,
    string BodyHtml,
    DateTime NowUtc
);