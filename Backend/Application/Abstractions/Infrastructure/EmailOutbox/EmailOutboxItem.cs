namespace Backend.Application.Abstractions.Infrastructure.EmailOutbox;

public sealed record EmailOutboxItem(
    long Id,
    string Kind,
    string ToEmail,
    string Subject,
    string BodyHtml,
    int Attempts
);