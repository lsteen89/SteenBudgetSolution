using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Options.Verification;
using Backend.Application.Common.Security;
using Backend.Domain.Errors.User;
using Backend.Domain.Shared;
using Microsoft.Extensions.Options;
using MediatR;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Authentication.Shared.Models;
using Backend.Application.Features.Shared.Issuers.Auth;


namespace Backend.Application.Features.VerifyEmail;

public sealed class VerifyEmailCodeCommandHandler
    : IRequestHandler<VerifyEmailCodeCommand, Result<IssuedAuthSession>>
{
    private readonly IUserRepository _users;
    private readonly IEmailVerificationCodeRepository _codes;
    private readonly ITimeProvider _clock;
    private readonly VerificationCodeOptions _opt;
    private readonly IAuthSessionIssuer _issuer;

    public VerifyEmailCodeCommandHandler(
        IUserRepository users,
        IEmailVerificationCodeRepository codes,
        ITimeProvider clock,
        IOptions<VerificationCodeOptions> opt,
        IAuthSessionIssuer issuer)
    {
        _users = users;
        _codes = codes;
        _clock = clock;
        _opt = opt.Value;
        _issuer = issuer;
    }

    public async Task<Result<IssuedAuthSession>> Handle(VerifyEmailCodeCommand req, CancellationToken ct)
    {
        var emailNorm = req.Email.Trim().ToLowerInvariant();
        var user = await _users.GetUserModelAsync(email: emailNorm, ct: ct);
        if (user is null)
            return Result<IssuedAuthSession>.Failure(UserErrors.InvalidVerificationCode);

        var now = _clock.UtcNow;

        // If already confirmed: still issue session (nice UX)
        if (user.EmailConfirmed)
        {
            var issuedAlready = await _issuer.IssueAsync(user, req.RememberMe, req.DeviceId, req.UserAgent, ct);
            return Result<IssuedAuthSession>.Success(issuedAlready);
        }

        var state = await _codes.GetByUserAsync(user.PersoId, ct);
        if (state is null)
            return Result<IssuedAuthSession>.Failure(UserErrors.InvalidVerificationCode);

        if (state.LockedUntilUtc is not null && state.LockedUntilUtc > now)
            return Result<IssuedAuthSession>.Failure(UserErrors.VerificationLocked);

        if (state.ExpiresAtUtc <= now)
            return Result<IssuedAuthSession>.Failure(UserErrors.VerificationExpired);

        var secret = Convert.FromBase64String(_opt.CodeHmacKeyBase64);
        var expected = VerificationCode.Hash(user.PersoId, req.Code, secret);

        if (!VerificationCode.FixedTimeEquals(expected, state.CodeHash))
        {
            var newAttempts = state.AttemptCount + 1;
            DateTime? lockUntil = null;

            if (newAttempts >= _opt.MaxAttempts)
                lockUntil = now.AddMinutes(_opt.LockMinutes);

            await _codes.IncrementFailureAsync(user.PersoId, newAttempts, lockUntil, ct);
            return Result<IssuedAuthSession>.Failure(UserErrors.InvalidVerificationCode);
        }

        // Confirm + cleanup
        await _users.ConfirmUserEmailAsync(user.PersoId, ct);
        await _codes.DeleteAsync(user.PersoId, ct);

        // IMPORTANT: ensure the issued token carries email_confirmed=true
        // Either reload user or set the flag locally
        user.EmailConfirmed = true;

        var issued = await _issuer.IssueAsync(user, req.RememberMe, req.DeviceId, req.UserAgent, ct);
        return Result<IssuedAuthSession>.Success(issued);
    }
}
