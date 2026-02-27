using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Options.Verification;
using Backend.Application.Common.Security;
using Backend.Domain.Errors.User;
using Backend.Domain.Shared;
using Microsoft.Extensions.Options;
using MediatR;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;


namespace Backend.Application.Features.VerifyEmail;

public sealed class VerifyEmailCodeCommandHandler : IRequestHandler<VerifyEmailCodeCommand, Result>
{
    private readonly IUserRepository _users;
    private readonly IEmailVerificationCodeRepository _codes;
    private readonly ITimeProvider _clock;
    private readonly VerificationCodeOptions _opt;

    public VerifyEmailCodeCommandHandler(
        IUserRepository users,
        IEmailVerificationCodeRepository codes,
        ITimeProvider clock,
        IOptions<VerificationCodeOptions> opt)
    {
        _users = users;
        _codes = codes;
        _clock = clock;
        _opt = opt.Value;
    }

    public async Task<Result> Handle(VerifyEmailCodeCommand req, CancellationToken ct)
    {
        var emailNorm = req.Email.Trim().ToLowerInvariant();
        var user = await _users.GetUserModelAsync(email: emailNorm, ct: ct);
        if (user is null)
            return Result.Failure(UserErrors.InvalidVerificationCode); // generic

        if (user.EmailConfirmed)
            return Result.Success();

        var state = await _codes.GetByUserAsync(user.PersoId, ct);
        if (state is null)
            return Result.Failure(UserErrors.InvalidVerificationCode);

        var now = _clock.UtcNow;

        if (state.LockedUntilUtc is not null && state.LockedUntilUtc > now)
            return Result.Failure(UserErrors.VerificationLocked);

        if (state.ExpiresAtUtc <= now)
            return Result.Failure(UserErrors.VerificationExpired);

        var secret = Convert.FromBase64String(_opt.CodeHmacKeyBase64);
        var expected = VerificationCode.Hash(user.PersoId, req.Code, secret);

        if (!VerificationCode.FixedTimeEquals(expected, state.CodeHash))
        {
            var newAttempts = state.AttemptCount + 1;
            DateTime? lockUntil = null;

            if (newAttempts >= _opt.MaxAttempts)
                lockUntil = now.AddMinutes(_opt.LockMinutes);

            await _codes.IncrementFailureAsync(user.PersoId, newAttempts, lockUntil, ct);
            return Result.Failure(UserErrors.InvalidVerificationCode);
        }

        await _users.ConfirmUserEmailAsync(user.PersoId, ct);
        await _codes.DeleteAsync(user.PersoId, ct);

        return Result.Success();
    }
}
