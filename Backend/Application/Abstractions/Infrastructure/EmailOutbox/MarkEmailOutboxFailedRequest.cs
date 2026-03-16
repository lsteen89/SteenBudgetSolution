namespace Backend.Application.Abstractions.Infrastructure.EmailOutbox;

public sealed record MarkEmailOutboxFailedRequest(
    long Id,
    int Attempts,
    DateTime NextAttemptAtUtc,
    string Error,
    DateTime NowUtc
);