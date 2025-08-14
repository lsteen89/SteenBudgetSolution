using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Options.Auth;
using MediatR;
using Microsoft.Extensions.Options;
using Backend.Settings.Email;
using Backend.Application.Options.URL;
using Backend.Application.Features.Events.Register;
using Backend.Application.Abstractions.Infrastructure.System;

namespace Backend.Application.Features.Register;

public sealed class UserRegisteredEventHandler : INotificationHandler<UserRegisteredEvent>
{
    private readonly IVerificationTokenRepository _tokens;
    private readonly IEmailRateLimiter _rateLimiter;
    private readonly IEmailService _email;
    private readonly IUserRepository _users;
    private readonly IOptions<VerificationTokenOptions> _tokenOptions;
    private readonly IOptions<AppUrls> _urlSettings;
    private readonly IOptions<SmtpSettings> _emailSettings;
    private readonly ITimeProvider _clock;
    private readonly ILogger<UserRegisteredEventHandler> _log;

    public UserRegisteredEventHandler(
        IVerificationTokenRepository tokens,
        IEmailRateLimiter rateLimiter,
        IEmailService email,
        IUserRepository users,
        IOptions<VerificationTokenOptions> tokenOptions,
        IOptions<AppUrls> urlSettings,
        ITimeProvider clock,
        IOptions<SmtpSettings> emailSettings,

        ILogger<UserRegisteredEventHandler> log)
    {
        _tokens = tokens;
        _rateLimiter = rateLimiter;
        _email = email;
        _users = users;
        _tokenOptions = tokenOptions;
        _urlSettings = urlSettings;
        _emailSettings = emailSettings;
        _clock = clock;
        _log = log;
    }

    public async Task Handle(UserRegisteredEvent notification, CancellationToken ct)
    {
        using var scope = _log.BeginScope(new { UserId = notification.UserId });
        _log.LogInformation("Processing UserRegisteredEvent...");

        // 0) Optional: if already confirmed, bail (saves email budget)
        var user = await _users.GetUserModelAsync(persoid: notification.UserId, ct: ct);
        if (user?.EmailConfirmed == true)
        {
            _log.LogInformation("User already confirmed; skipping verification email.");
            return;
        }

        // 1) Rate limit
        var decision = await _rateLimiter.CheckAsync(notification.UserId, EmailKind.Verification, ct);
        if (!decision.Allowed)
        {
            _log.LogWarning("Verification email rate limit exceeded.");
            return;
        }

        // 2) Create token (handler owns generation; repo just persists)
        var now = _clock.UtcNow;
        var ttl = TimeSpan.FromHours(_tokenOptions.Value.TtlHours);
        var token = Guid.NewGuid();
        var exp = now.Add(ttl);

        var rows = await _tokens.UpsertSingleActiveAsync(notification.UserId, token, exp, ct);
        if (rows <= 0)
        {
            _log.LogError("Failed to upsert verification token.");
            return;
        }

        // 3) Compose email
        var composer = new VerificationEmailComposer(
            _urlSettings.Value,
            _emailSettings.Value,
            notification.Email,
            token // pass the GUID (or pass a url-safe string if that’s your API)
        );

        // 4) Send (retry/backoff is a nice-to-have; here we just log)
        var result = await _email.SendEmailAsync(composer, ct);
        if (!result.Success)
        {
            _log.LogError("Failed to send verification email: {Error}", result.Error);
            return;
        }

        // 5) Mark sent (use same clock source)
        await _rateLimiter.MarkSentAsync(notification.UserId, EmailKind.Verification, now, ct);
        _log.LogInformation("Verification email sent.");
    }

}