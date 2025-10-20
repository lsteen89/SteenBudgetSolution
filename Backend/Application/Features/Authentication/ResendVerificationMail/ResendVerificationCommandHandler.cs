using MediatR;
using Backend.Domain.Shared;
using Backend.Domain.Users;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Options.Auth;
using Microsoft.Extensions.Options;
using Backend.Application.Options.URL;
using Backend.Settings.Email;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Commands.Auth.ResendVerification;

public sealed class ResendVerificationCommandHandler
    : IRequestHandler<ResendVerificationCommand, Result>, ITransactionalCommand
{
    private static readonly TimeSpan ReuseIfRemaining = TimeSpan.FromMinutes(5);

    private readonly IUserRepository _users;
    private readonly IVerificationTokenRepository _tokens;
    private readonly IEmailRateLimiter _rateLimiter;
    private readonly IEmailService _email;
    private readonly ITimeProvider _clock;
    private readonly IOptions<VerificationTokenOptions> _tokenOpts;
    private readonly IOptions<AppUrls> _urls;
    private readonly IOptions<SmtpSettings> _smtp;
    private readonly ILogger<ResendVerificationCommandHandler> _log;

    public ResendVerificationCommandHandler(
        IUserRepository users,
        IVerificationTokenRepository tokens,
        IEmailRateLimiter rateLimiter,
        IEmailService email,
        ITimeProvider clock,
        IOptions<VerificationTokenOptions> tokenOpts,
        IOptions<AppUrls> urls,
        IOptions<SmtpSettings> smtp,
        ILogger<ResendVerificationCommandHandler> log)
    {
        _users = users; _tokens = tokens; _rateLimiter = rateLimiter; _email = email;
        _clock = clock; _tokenOpts = tokenOpts; _urls = urls; _smtp = smtp; _log = log;
    }

    public async Task<Result> Handle(ResendVerificationCommand cmd, CancellationToken ct)
    {
        var now = _clock.UtcNow;
        var emailNorm = cmd.Email.Trim().ToLowerInvariant();

        var user = await _users.GetUserModelAsync(email: emailNorm, ct: ct);
        if (user is null || user.EmailConfirmed) return Result.Success(); // no enumeration

        var decision = await _rateLimiter.CheckAsync(user.PersoId, EmailKind.Verification, ct);
        if (!decision.Allowed) return Result.Success(); // silently ignore

        // Reuse existing token if it won’t expire imminently; otherwise mint a new one
        var existing = await _tokens.GetByUserAsync(user.PersoId, ct);
        Guid token;
        DateTime expiry;
        var ttl = TimeSpan.FromHours(_tokenOpts.Value.TtlHours);

        if (existing is not null && existing.TokenExpiryDate > now.Add(ReuseIfRemaining))
        {
            token = existing.Token;
            expiry = existing.TokenExpiryDate;
        }
        else
        {
            token = Guid.NewGuid();
            expiry = now.Add(ttl);
            var rows = await _tokens.UpsertSingleActiveAsync(user.PersoId, token, expiry, ct);
            if (rows <= 0) return Result.Failure(UserErrors.VerificationUpdateFailed);
        }

        // Compose + send
        var composer = new VerificationEmailComposer(_urls.Value, _smtp.Value, emailNorm, token);
        var sent = await _email.SendEmailAsync(composer, ct);
        if (!sent.Success)
        {
            _log.LogWarning("Resend verification failed: {Err}", sent.Error);
            return Result.Failure(UserErrors.EmailSendFailed);
        }

        await _rateLimiter.MarkSentAsync(user.PersoId, EmailKind.Verification, now, ct);
        return Result.Success();
    }
}