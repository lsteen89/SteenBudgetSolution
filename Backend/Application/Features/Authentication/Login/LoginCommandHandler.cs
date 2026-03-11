using MediatR;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Data;
using Microsoft.Extensions.Options;
using Backend.Settings;
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Application.Services.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Domain.Errors.User;
using Backend.Application.Features.Authentication.Shared.Models;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Features.Shared.Issuers.Auth;

namespace Backend.Application.Features.Authentication.Login;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, Result<IssuedAuthSession>>
{
    private const string DummyHash = "$2a$12$3v7iZz9K0wKQ9M3m8v6sUe7A1QWJ0rj3i4n0eQ9yHvsb8yT2t5m8a"; // precomputed bcrypt of "dummy"
    private readonly IUserAuthenticationRepository _authz;
    private readonly IOptions<AuthLockoutOptions> _lockoutOpts;
    private readonly IUserRepository _users;
    private readonly IHumanChallengePolicy _humanChallengePolicy;
    private readonly ITurnstileService _turnstile;
    private readonly IAuthSessionIssuer _issuer;
    private readonly ITimeProvider _clock;
    private readonly ILogger<LoginCommandHandler> _log;
    public LoginCommandHandler(
        IUserAuthenticationRepository authz,
        IOptions<AuthLockoutOptions> lockoutOpts,
        IUserRepository users,
        IHumanChallengePolicy humanChallengePolicy,
        ITurnstileService turnstile,
        IAuthSessionIssuer issuer,
        ITimeProvider clock,
        ILogger<LoginCommandHandler> log
    )
    {
        _authz = authz; _lockoutOpts = lockoutOpts; _users = users;
        _humanChallengePolicy = humanChallengePolicy; _turnstile = turnstile; _issuer = issuer;
        _clock = clock; _log = log;
    }

    public async Task<Result<IssuedAuthSession>> Handle(LoginCommand c, CancellationToken ct)
    {
        var emailNorm = c.Email.Trim().ToLowerInvariant();
        var now = _clock.UtcNow;

        // 0) Decide if we require a challenge (you define the rule)
        var requiresChallenge = await _humanChallengePolicy.ShouldRequireAsync(emailNorm, c.RemoteIp, c.UserAgent, ct);

        // 1) If required, token must exist
        if (requiresChallenge && string.IsNullOrWhiteSpace(c.HumanToken))
            return Result<IssuedAuthSession>.Failure(UserErrors.HumanVerificationRequired);

        // 2) If token exists (or required), validate it
        if (!string.IsNullOrWhiteSpace(c.HumanToken))
        {
            var ok = await _turnstile.ValidateAsync(c.HumanToken, remoteIp: c.RemoteIp, ct);
            if (!ok) return Result<IssuedAuthSession>.Failure(UserErrors.InvalidChallengeToken);
        }

        // 3) load + lockout
        var user = await _users.GetUserModelAsync(email: emailNorm, ct: ct);

        if (user?.LockoutUntil is DateTime until)
        {
            if (until > now)
            {
                _log.LogInformation("User locked until {Until}", until);
                return Result<IssuedAuthSession>.Failure(UserErrors.UserLockedOut);
            }
            await _authz.UnlockUserAsync(user.PersoId, ct); // expired → clear
        }

        // 4) Credentials (timing-safe)
        var since = now.AddMinutes(-_lockoutOpts.Value.WindowMinutes);
        bool passwordOk = user is not null && !string.IsNullOrEmpty(user.Password)
            ? BCrypt.Net.BCrypt.Verify(c.Password, user.Password)
            : BCrypt.Net.BCrypt.Verify(c.Password, DummyHash);

        var isValid = user is not null && passwordOk;

        if (!isValid)
        {
            if (user is not null)
            {
                await _authz.InsertLoginAttemptAsync(user, c.RemoteIp, c.UserAgent, now, ct);
                var fails = await _authz.CountFailedAttemptsSinceAsync(emailNorm, since, ct);
                if (fails >= _lockoutOpts.Value.MaxAttempts)
                    await _authz.LockUserByEmailAsync(emailNorm, now.AddMinutes(_lockoutOpts.Value.LockoutMinutes), ct);
            }

            return Result<IssuedAuthSession>.Failure(UserErrors.InvalidCredentials);
        }

        if (string.IsNullOrWhiteSpace(user!.Email))
            return Result<IssuedAuthSession>.Failure(UserErrors.InvalidCredentials);

        // 5) Issue session via shared issuer (NEW single source of truth)
        var issued = await _issuer.IssueAsync(
            user,
            rememberMe: c.RememberMe,
            deviceId: c.DeviceId,
            userAgent: c.UserAgent,
            ct);

        // 6) Reset failed attempts
        await _authz.DeleteAttemptsByEmailAsync(emailNorm, ct);

        return Result<IssuedAuthSession>.Success(issued);
    }
}

