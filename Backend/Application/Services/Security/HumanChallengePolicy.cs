using Backend.Application.Abstractions.Application.Services.Security;
using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Options.Auth;
using Backend.Application.Abstractions.Infrastructure.System;

namespace Backend.Application.Services.Security;

public sealed class HumanChallengePolicy : IHumanChallengePolicy
{
    private readonly IUserAuthenticationRepository _authz;
    private readonly ITimeProvider _clock;
    private readonly IOptions<HumanChallengeOptions> _opt;

    public HumanChallengePolicy(IUserAuthenticationRepository authz, ITimeProvider clock, IOptions<HumanChallengeOptions> opt)
    {
        _authz = authz;
        _clock = clock;
        _opt = opt;
    }

    public async Task<bool> ShouldRequireAsync(string emailNorm, string? remoteIp, string? userAgent, CancellationToken ct)
    {
        // If we have no IP, we can’t score reliably -> require challenge.
        if (string.IsNullOrWhiteSpace(remoteIp)) return true;

        var since = _clock.UtcNow.AddMinutes(-_opt.Value.WindowMinutes);

        // Strongest: same email + same IP repeated fails
        var emailIpFails = await _authz.CountFailedAttemptsByEmailAndIpSinceAsync(emailNorm, remoteIp, since, ct);
        if (emailIpFails >= _opt.Value.EmailIpFailsThreshold) return true;

        // Email targeted guessing
        var emailFails = await _authz.CountFailedAttemptsByEmailSinceAsync(emailNorm, since, ct);
        if (emailFails >= _opt.Value.EmailFailsThreshold) return true;

        // IP spray
        var ipFails = await _authz.CountFailedAttemptsByIpSinceAsync(remoteIp, since, ct);
        if (ipFails >= _opt.Value.IpFailsThreshold) return true;

        // Very light suspicious UA signal (keep it conservative)
        if (string.IsNullOrWhiteSpace(userAgent)) return true;

        return false;
    }
}