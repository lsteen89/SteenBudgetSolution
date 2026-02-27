
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Settings;
using Microsoft.Extensions.Options;
using Backend.Application.DTO.Auth;
using Backend.Domain.Entities.User;
using Backend.Infrastructure.Entities.Tokens;
using Backend.Infrastructure.Security;
using Backend.Domain.Shared;
using Backend.Infrastructure.WebSockets;
using Backend.Application.Features.Authentication.Shared.Models;


namespace Backend.Application.Features.Shared.Issuers.Auth;

public sealed class AuthSessionIssuer : IAuthSessionIssuer
{
    private readonly IRefreshTokenRepository _refreshRepo;
    private readonly IJwtService _jwt;
    private readonly ITimeProvider _clock;
    private readonly IOptions<JwtSettings> _jwtSettings;
    private readonly WebSocketSettings _wsCfg;

    public AuthSessionIssuer(
        IRefreshTokenRepository refreshRepo,
        IJwtService jwt,
        ITimeProvider clock,
        IOptions<JwtSettings> jwtSettings,
        IOptions<WebSocketSettings> wsOpts)
    {
        _refreshRepo = refreshRepo;
        _jwt = jwt;
        _clock = clock;
        _jwtSettings = jwtSettings;
        _wsCfg = wsOpts.Value;
    }

    public async Task<IssuedAuthSession> IssueAsync(
        UserModel user,
        bool rememberMe,
        string deviceId,
        string userAgent,
        CancellationToken ct)
    {
        var now = _clock.UtcNow;

        IReadOnlyList<string> roles = new[] { "User" }; // TODO parse from user.Roles

        // Access token (includes email_confirmed claim!)
        var at = _jwt.CreateAccessToken(
            persoid: user.PersoId,
            email: user.Email!,
            roles: roles,
            deviceId: deviceId,
            userAgent: userAgent,
            emailConfirmed: user.EmailConfirmed,
            sessionId: null);


        var rolling = now.AddDays(_jwtSettings.Value.RefreshTokenExpiryDays);
        var absolute = now.AddDays(_jwtSettings.Value.RefreshTokenExpiryDaysAbsolute);
        if (rolling > absolute) rolling = absolute;

        var plainRt = _jwt.CreateRefreshToken();

        var row = new RefreshJwtTokenEntity
        {
            TokenId = Guid.NewGuid(),
            Persoid = user.PersoId,
            SessionId = at.SessionId,
            HashedToken = TokenGenerator.HashToken(plainRt),
            AccessTokenJti = at.TokenJti,
            ExpiresRollingUtc = rolling,
            ExpiresAbsoluteUtc = absolute,
            RevokedUtc = null,
            Status = TokenStatus.Active,
            IsPersistent = rememberMe,
            DeviceId = deviceId,
            UserAgent = userAgent,
            CreatedUtc = now
        };

        try
        {
            var inserted = await _refreshRepo.InsertAsync(row, ct);
            if (inserted != 1) throw new InvalidOperationException("Failed to insert refresh token.");
        }
        catch (DuplicateKeyException)
        {
            plainRt = _jwt.CreateRefreshToken();
            var retryHash = TokenGenerator.HashToken(plainRt);
            row = new RefreshJwtTokenEntity
            {
                TokenId = row.TokenId,
                Persoid = row.Persoid,
                SessionId = row.SessionId,
                HashedToken = retryHash,
                AccessTokenJti = row.AccessTokenJti,
                ExpiresRollingUtc = row.ExpiresRollingUtc,
                ExpiresAbsoluteUtc = row.ExpiresAbsoluteUtc,
                RevokedUtc = row.RevokedUtc,
                Status = row.Status,
                IsPersistent = row.IsPersistent,
                DeviceId = row.DeviceId,
                UserAgent = row.UserAgent,
                CreatedUtc = row.CreatedUtc
            };

            var inserted = await _refreshRepo.InsertAsync(row, ct);
            if (inserted != 1) throw;
        }

        var wsMac = WebSocketAuth.MakeWsMac(user.PersoId, at.SessionId, _wsCfg.Secret);

        var result = new AuthResult(
            AccessToken: at.Token,
            PersoId: user.PersoId,
            SessionId: at.SessionId,
            WsMac: wsMac,
            RememberMe: rememberMe);

        return new IssuedAuthSession(result, plainRt);
    }
}