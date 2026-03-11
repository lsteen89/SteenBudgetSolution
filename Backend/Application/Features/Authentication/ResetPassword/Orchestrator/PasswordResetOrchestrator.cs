using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.EmailOutbox;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Models.Auth;
using Backend.Domain.Shared;
using Backend.Infrastructure.Email.Composers.Auth;
using Backend.Domain.Common.Constants;
using Backend.Application.Abstractions.Application.Orchestrators;



namespace Backend.Application.Features.Authentication.ResetPassword.Orchestrator;

public sealed class PasswordResetOrchestrator : IPasswordResetOrchestrator
{
    private readonly IUserRepository _users;
    private readonly IPasswordResetRepository _passwordResets;
    private readonly IPasswordResetCodeService _codes;
    private readonly IEmailOutboxRepository _emailOutbox;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly ITimeProvider _clock;
    private readonly ILogger<PasswordResetOrchestrator> _log;

    public PasswordResetOrchestrator(
        IUserRepository users,
        IPasswordResetRepository passwordResets,
        IPasswordResetCodeService codes,
        IEmailOutboxRepository emailOutbox,
        IRefreshTokenRepository refreshTokens,
        ITimeProvider clock,
        ILogger<PasswordResetOrchestrator> log)
    {
        _users = users;
        _passwordResets = passwordResets;
        _codes = codes;
        _emailOutbox = emailOutbox;
        _refreshTokens = refreshTokens;
        _clock = clock;
        _log = log;
    }

    public async Task RequestResetAsync(string email, string? locale, CancellationToken ct)
    {
        var emailNorm = email.Trim().ToLowerInvariant();

        var user = await _users.GetUserModelAsync(persoid: null, email: emailNorm, ct);
        if (user is null)
        {
            _log.LogInformation("Password reset requested for non-existing email {Email}", emailNorm);
            return;
        }

        var nowUtc = _clock.UtcNow;
        var expiresAtUtc = nowUtc.AddMinutes(15);
        var code = _codes.GenerateCode();
        var codeHash = _codes.HashCode(code);

        var reset = new PasswordResetCodeRecord(
            Id: Guid.NewGuid(),
            UserId: user.PersoId,
            Email: emailNorm,
            CodeHash: codeHash,
            ExpiresAtUtc: expiresAtUtc,
            CreatedAtUtc: nowUtc,
            UsedAtUtc: null,
            InvalidatedAtUtc: null
        );

        var emailContent = new ResetPasswordEmailComposer(
            code: code,
            expiresAtUtc: expiresAtUtc,
            locale: locale,
            loginUrl: "/login",
            forgotPasswordUrl: "/forgot-password"
        );

        await _passwordResets.InvalidateActiveCodesForUserAsync(user.PersoId, ct);
        await _passwordResets.CreateAsync(reset, ct);

        await _emailOutbox.EnqueueAsync(
            kind: "password-reset",
            toEmail: emailNorm,
            subject: emailContent.Subject,
            bodyHtml: emailContent.BodyHtml,
            nowUtc: nowUtc,
            ct: ct
        );
    }

    public async Task<Result> ResetAsync(string email, string code, string newPassword, CancellationToken ct)
    {
        var emailNorm = email.Trim().ToLowerInvariant();

        var user = await _users.GetUserModelAsync(persoid: null, email: emailNorm, ct);
        if (user is null)
        {
            return Result.Failure(new Error(
                "PasswordReset.InvalidOrExpired",
                "The reset request is invalid or expired.",
                ErrorType.Validation
            ));
        }

        var reset = await _passwordResets.GetActiveByEmailAsync(emailNorm, ct);
        if (reset is null)
        {
            return Result.Failure(new Error(
                "PasswordReset.InvalidOrExpired",
                "The reset request is invalid or expired.",
                ErrorType.Validation
            ));
        }

        if (reset.ExpiresAtUtc < _clock.UtcNow)
        {
            return Result.Failure(new Error(
                "PasswordReset.InvalidOrExpired",
                "The reset request is invalid or expired.",
                ErrorType.Validation
            ));
        }

        if (!_codes.VerifyCode(code, reset.CodeHash))
        {
            return Result.Failure(new Error(
                "PasswordReset.InvalidOrExpired",
                "The reset request is invalid or expired.",
                ErrorType.Validation
            ));
        }

        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);

        var updated = await _users.UpdatePasswordAsync(user.PersoId, newPasswordHash, ct);
        if (!updated)
        {
            return Result.Failure(new Error(
                "PasswordReset.UpdateFailed",
                "Could not update password.",
                ErrorType.Failure
            ));
        }

        await _passwordResets.MarkUsedAsync(reset.Id, ct);
        await _refreshTokens.RevokeAllForUserAsync(user.PersoId, _clock.UtcNow, ct);

        return Result.Success();
    }
}