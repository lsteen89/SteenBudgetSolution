using MediatR;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Microsoft.Extensions.Logging;

namespace Backend.Application.Features.Commands.Auth.RefreshToken;

public sealed class ScanExpiredTokensCommandHandler
    : IRequestHandler<ScanExpiredTokensCommand, Unit>
{
    private readonly IRefreshTokenRepository _repo;
    private readonly IWebSocketManager _wsMgr;
    private readonly ILogger<ScanExpiredTokensCommandHandler> _logger;

    public ScanExpiredTokensCommandHandler(
        IRefreshTokenRepository repo,
        IWebSocketManager wsMgr,
        ILogger<ScanExpiredTokensCommandHandler> logger)
    {
        _repo = repo;
        _wsMgr = wsMgr;
        _logger = logger;
    }

    public async Task<Unit> Handle(
        ScanExpiredTokensCommand request,
        CancellationToken ct)
    {
        var expiredTokens = await _repo.GetExpiredTokensAsync(ct: ct);

        if (!expiredTokens.Any())
        {
            _logger.LogInformation("Found 0 expired tokens.");
            return Unit.Value;
        }

        _logger.LogInformation("Found {Count} expired tokens.", expiredTokens.Count());

        foreach (var token in expiredTokens)
        {
            _logger.LogInformation(
                "Force logout for {User}: expired at {When}.",
                token.Persoid, token.ExpiresRollingUtc);

            await _wsMgr.ForceLogoutAsync(token.Persoid.ToString(), "session-expired");

            var deleted = await _repo.DeleteTokenAsync(token.HashedToken, ct);
            if (!deleted)
            {
                _logger.LogError("Failed to delete expired token {Token}.", token.HashedToken);
                // decision: continue, don't throw, to avoid failing whole batch
            }
        }

        return Unit.Value;
    }
}
