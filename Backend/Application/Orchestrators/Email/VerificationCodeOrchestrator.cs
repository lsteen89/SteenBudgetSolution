using Backend.Application.Abstractions.Application.Orchestrators;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Abstractions.Infrastructure.EmailOutbox;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Options.Verification;
using Microsoft.Extensions.Options;
using Backend.Application.Common.Security;
using Backend.Application.Orchestrators.Email.Generators;

namespace Backend.Application.Orchestrators.Email;

public sealed class VerificationCodeOrchestrator : IVerificationCodeOrchestrator
{
    private readonly IEmailVerificationCodeRepository _codes;
    private readonly IEmailOutboxRepository _outbox;
    private readonly IEmailRateLimiter _rateLimiter;
    private readonly IVerificationCodeGenerator _codeGen;
    private readonly ITimeProvider _clock;
    private readonly VerificationCodeOptions _opt;

    public VerificationCodeOrchestrator(
        IEmailVerificationCodeRepository codes,
        IEmailOutboxRepository outbox,
        IEmailRateLimiter rateLimiter,
        IVerificationCodeGenerator codeGen,
        ITimeProvider clock,
        IOptions<VerificationCodeOptions> opt)
    {
        _codes = codes;
        _outbox = outbox;
        _rateLimiter = rateLimiter;
        _codeGen = codeGen;
        _clock = clock;
        _opt = opt.Value;
    }

    public async Task EnqueueForNewUserAsync(Guid persoId, string email, string? locale, CancellationToken ct)
    {
        await EnqueueInternalAsync(persoId, email, locale, isNewUser: true, ct);
    }

    public async Task EnqueueForResendAsync(Guid persoId, string email, string? locale, CancellationToken ct)
    {
        await EnqueueInternalAsync(persoId, email, locale, isNewUser: false, ct);
    }

    private async Task EnqueueInternalAsync(Guid persoId, string email, string? locale, bool isNewUser, CancellationToken ct)
    {
        var decision = await _rateLimiter.CheckAsync(persoId, EmailKind.Verification, ct);
        if (!decision.Allowed) return; // silent ignore (no enumeration)

        var now = _clock.UtcNow;
        var expires = now.AddMinutes(_opt.TtlMinutes);

        var code = _codeGen.New6Digits();
        var secret = Convert.FromBase64String(_opt.CodeHmacKeyBase64);
        var hash = VerificationCode.Hash(persoId, code, secret);

        if (isNewUser)
            await _codes.UpsertActiveForRegisterAsync(persoId, hash, expires, now, ct);
        else
            await _codes.UpsertActiveForResendAsync(persoId, hash, expires, now, ct);

        var composer = new VerificationCodeEmailComposer(
            code: code,
            expiresAtUtc: expires,
            locale: locale,
            loginUrl: "/login",
            recoveryUrl: "/account-recovery", //Todo THIS IS WRONG! CHECK UP THE CORRECT URL FOR ACCOUNT RECOVERY
            forgotPasswordUrl: "/forgot-password"
        );


        await _outbox.EnqueueAsync(
            kind: "VerificationCode",
            toEmail: email,
            subject: composer.Subject,
            bodyHtml: composer.BodyHtml,
            nowUtc: now,
            ct: ct);

        await _rateLimiter.MarkSentAsync(persoId, EmailKind.Verification, now, ct);
        await _codes.MarkSentAsync(persoId, now, ct);
    }
}
