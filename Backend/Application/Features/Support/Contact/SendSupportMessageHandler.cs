using Backend.Application.Abstractions.Infrastructure.EmailOutbox;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Support.Contact.Composer;
using Backend.Domain.Errors.Support;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Support.Contact;

public sealed class SendSupportMessageHandler
    : ICommandHandler<SendSupportMessageCommand, Result>
{
    private readonly IUserRepository _users;
    private readonly IEmailOutboxRepository _outbox;
    private readonly ITimeProvider _clock;
    private readonly ILogger<SendSupportMessageHandler> _logger;

    public SendSupportMessageHandler(
        IUserRepository users,
        IEmailOutboxRepository outbox,
        ITimeProvider clock,
        ILogger<SendSupportMessageHandler> logger)
    {
        _users = users;
        _outbox = outbox;
        _clock = clock;
        _logger = logger;
    }

    public async Task<Result> Handle(
        SendSupportMessageCommand request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Subject) ||
            string.IsNullOrWhiteSpace(request.Body) ||
            request.Subject.Length > 200 ||
            request.Body.Length > 4000)
        {
            return Result.Failure(SupportErrors.ValidationFailed);
        }

        var user = await _users.GetUserModelAsync(request.Persoid, email: null, ct);
        if (user is null)
        {
            return Result.Failure(SupportErrors.UserNotFound);
        }

        var now = _clock.UtcNow;

        var normalizedCategory = string.IsNullOrWhiteSpace(request.Category)
            ? null
            : request.Category.Trim();

        var trimmedSubject = request.Subject.Trim();
        var trimmedBody = request.Body.Trim();

        var queueSubject = normalizedCategory is null
            ? $"[Support] {trimmedSubject}"
            : $"[Support:{normalizedCategory}] {trimmedSubject}";

        var firstName = user.FirstName?.Trim() ?? string.Empty;
        var lastName = user.LastName?.Trim() ?? string.Empty;
        var email = user.Email?.Trim();

        if (string.IsNullOrWhiteSpace(email))
        {
            return Result.Failure(SupportErrors.UserNotFound);
        }

        var bodyHtml = SupportMessageEmailComposer.ComposeHtml(
            firstName: firstName,
            lastName: lastName,
            email: email,
            subject: trimmedSubject,
            body: trimmedBody,
            category: normalizedCategory,
            ipAddress: request.IpAddress,
            userAgent: request.UserAgent,
            userId: user.Id.ToString()
        );

        await _outbox.EnqueueAsync(
            new EnqueueEmailOutboxRequest(
                Kind: "support_message",
                ToEmail: "support@yourdomain.com",
                Subject: queueSubject,
                BodyHtml: bodyHtml,
                NowUtc: now
            ),
            ct
        );

        _logger.LogInformation(
            "Queued support message from Persoid={Persoid} Email={Email}",
            request.Persoid,
            email
        );

        return Result.Success();
    }
}