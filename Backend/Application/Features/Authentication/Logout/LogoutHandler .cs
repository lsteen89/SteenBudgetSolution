using MediatR;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Helpers.Jwt;
using Backend.Infrastructure.WebSockets;

namespace Backend.Application.Features.Commands.Auth.Logout;

public sealed class LogoutHandler : IRequestHandler<LogoutCommand, Unit>, ITransactionalCommand
{
    private readonly IRefreshTokenRepository _refreshRepo;
    private readonly IJwtService _jwt;
    private readonly ITimeProvider _clock;
    private readonly IWebSocketManager _ws;
    private readonly ILogger<LogoutHandler> _log;

    public LogoutHandler(IRefreshTokenRepository refreshRepo, IJwtService jwt,
                         ITimeProvider clock, IWebSocketManager ws, ILogger<LogoutHandler> log)
    {
        _refreshRepo = refreshRepo; _jwt = jwt; _clock = clock; _ws = ws; _log = log;
    }

    public async Task<Unit> Handle(LogoutCommand c, CancellationToken ct)
    {
        var now = _clock.UtcNow;

        // 0) Validate AT to trust claims. If invalid, we still return success (client clears cookies).
        var persoid = TokenHelper.GetUserIdFromToken(c.AccessToken);
        if (persoid == Guid.Empty)
        {
            _log.LogWarning("Logout: could not resolve PersoId from access token.");
            return Unit.Value; // still clear cookie client-side
        }

        // 1) Best-effort blacklist (don’t fail logout on errors)
        try { await _jwt.BlacklistJwtTokenAsync(c.AccessToken, ct); }
        catch (Exception ex) { _log.LogWarning(ex, "Logout: blacklist failed; continuing."); }

        // 2) Revoke refresh tokens (UPDATE -> trigger archives)
        int affected = 0;
        if (c.LogoutAll)
        {
            affected = await _refreshRepo.RevokeAllForUserAsync(persoid, now, ct);
        }
        else
        {
            if (c.SessionId == Guid.Empty)
            {
                _log.LogWarning("Logout: missing SessionId for single-session logout.");
                return Unit.Value;
            }
            affected = await _refreshRepo.RevokeSessionAsync(persoid, c.SessionId, now, ct);
        }

        // 3) WS notifications
        await _ws.SendMessageAsync(new UserSessionKey(persoid, c.SessionId), "LOGOUT");

        _log.LogInformation("Logout complete. Revoked={Cnt}", affected);
        return Unit.Value;
    }
}
