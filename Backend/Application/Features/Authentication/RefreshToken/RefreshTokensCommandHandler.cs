using MediatR;
using Backend.Application.DTO.Auth;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Microsoft.Extensions.Options;
using Backend.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Settings;
using Backend.Domain.Shared;
using Backend.Domain.Errors.User;
using Backend.Infrastructure.WebSockets;
using Backend.Application.Features.Authentication.Shared.Models;

namespace Backend.Application.Features.Authentication.RefreshToken;


public sealed class RefreshTokensCommandHandler : IRequestHandler<RefreshTokensCommand, Result<IssuedAuthSession>>
{
    private readonly IUnitOfWork _uow;
    private readonly IRefreshTokenRepository _refreshRepo;
    private readonly IUserRepository _userRepo;
    private readonly IJwtService _jwt;
    private readonly ITimeProvider _clock;

    private readonly ILogger<RefreshTokensCommandHandler> _log;
    private readonly JwtSettings _jwtSettings;
    private readonly TimeSpan _rollingWindow;
    private readonly WebSocketSettings _wsCfg;
    private readonly int _absoluteDays;

    public RefreshTokensCommandHandler(
        IUnitOfWork uow,
        IRefreshTokenRepository refreshRepo,
        IUserRepository userRepo,
        IJwtService jwt,

        ITimeProvider clock,
        IOptions<JwtSettings> jwtSettings,
        IOptions<WebSocketSettings> wsOpts,
        ILogger<RefreshTokensCommandHandler> log)
    {
        _uow = uow; _refreshRepo = refreshRepo; _userRepo = userRepo; _jwt = jwt; _clock = clock; _log = log;
        _jwtSettings = jwtSettings.Value;
        _wsCfg = wsOpts.Value;
        _rollingWindow = TimeSpan.FromDays(_jwtSettings.RefreshTokenExpiryDays);
        _absoluteDays = _jwtSettings.RefreshTokenExpiryDaysAbsolute;
    }

    public async Task<Result<IssuedAuthSession>> Handle(RefreshTokensCommand c, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(c.RefreshCookie))
            return Result<IssuedAuthSession>.Failure(UserErrors.InvalidRefreshToken);

        using var _ = _log.BeginScope(new Dictionary<string, object?> { ["DeviceId"] = c.DeviceId });
        var now = _clock.UtcNow;

        try
        {
            var cookieHash = TokenGenerator.HashToken(c.RefreshCookie);
            var current = await _refreshRepo.GetActiveByCookieForUpdateAsync(cookieHash, now, ct);
            if (current is null)
                return Result<IssuedAuthSession>.Failure(UserErrors.InvalidRefreshToken);

            using var scope1 = _log.BeginScope(new Dictionary<string, object?>
            {
                ["SessionId"] = current.SessionId,
                ["PersoId"] = current.Persoid
            });

            var user = await _userRepo.GetUserModelAsync(ct: ct, persoid: current.Persoid);
            if (user is null || string.IsNullOrWhiteSpace(user.Email))
                return Result<IssuedAuthSession>.Failure(UserErrors.RefreshUserNotFound);

            IReadOnlyList<string> roles = new[] { "User" };
            var at = _jwt.CreateAccessToken(
                persoid: current.Persoid,
                email: user.Email,
                roles: roles,
                deviceId: c.DeviceId,
                userAgent: c.UserAgent,
                emailConfirmed: user.EmailConfirmed,
                sessionId: current.SessionId
            );

            // Create next RT; extend ROLLING only, keep ABSOLUTE
            var newPlain = _jwt.CreateRefreshToken();
            var newHash = TokenGenerator.HashToken(newPlain);
            var newRolling = (now + _rollingWindow) <= current.ExpiresAbsoluteUtc
                ? now + _rollingWindow
                : current.ExpiresAbsoluteUtc;

            // Try rotate; if unique hash collision (1062), retry once IN-SCOPE
            try
            {
                var updated = await _refreshRepo.RotateInPlaceAsync(
                    current.TokenId, current.HashedToken, newHash, at.TokenJti, newRolling, ct);
                if (updated != 1) throw new InvalidOperationException("Refresh rotation failed.");
            }
            catch (MySqlConnector.MySqlException ex) when (ex.Number == 1062 && ex.Message.Contains("UK_Hashed"))
            {
                _log.LogWarning(ex, "Hash collision on refresh; retrying once.");
                newPlain = _jwt.CreateRefreshToken();
                newHash = TokenGenerator.HashToken(newPlain);
                var updated = await _refreshRepo.RotateInPlaceAsync(
                    current.TokenId, current.HashedToken, newHash, at.TokenJti, newRolling, ct);
                if (updated != 1) throw; // let pipeline roll back
            }

            // best-effort blacklist: don't fail the refresh if it throws
            if (!string.IsNullOrEmpty(c.AccessToken))
            {
                try { await _jwt.BlacklistJwtTokenAsync(c.AccessToken!, ct); }
                catch (Exception blEx) { _log.LogWarning(blEx, "Blacklist failed; continuing."); }
            }

            var wsMac = WebSocketAuth.MakeWsMac(current.Persoid, current.SessionId, _wsCfg.Secret);
            var result = new AuthResult(
                AccessToken: at.Token,
                PersoId: user.PersoId,
                SessionId: at.SessionId,
                WsMac: wsMac,
                RememberMe: current.IsPersistent
            );

            return Result<IssuedAuthSession>.Success(new IssuedAuthSession(result, newPlain));
        }
        catch (OperationCanceledException)
        {
            _log.LogWarning("Refresh cancelled.");
            throw; // pipeline rolls back
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Refresh failed.");
            throw; // IMPORTANT: throw so UoW rolls back rotation
        }
    }

}
