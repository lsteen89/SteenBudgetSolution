using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Settings;
using Microsoft.Extensions.Options;

public class ExpiredTokenScanner : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiredTokenScanner> _logger;
    private readonly TimeSpan _scanInterval;
    private readonly TimeSpan _heartbeatInterval;
    private readonly ExpiredTokenScannerSettings _settings;
    private readonly ITimeProvider _timeProvider;

    public ExpiredTokenScanner(
        IServiceScopeFactory scopeFactory,
        IOptions<ExpiredTokenScannerSettings> options,
        ITimeProvider timeProvider,
        ILogger<ExpiredTokenScanner> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = options.Value;
        _timeProvider = timeProvider;
        _scanInterval = TimeSpan.FromMinutes(_settings.ScanIntervalMinutes);
        _heartbeatInterval = TimeSpan.FromMinutes(_settings.HeartbeatIntervalMinutes);

        _logger.LogInformation(
          "ExpiredTokenScanner scan interval set to {Interval}, heartbeat interval set to {HeartbeatInterval}.",
           _scanInterval, _heartbeatInterval);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpiredTokenScanner started.");
        var lastHeartbeat = _timeProvider.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                // resolve everything from this scope:
                var repo = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
                var wsMgr = scope.ServiceProvider.GetRequiredService<IWebSocketManager>();

                // pull all expired tokens
                var expiredTokens = await repo.GetExpiredTokensAsync(ct: stoppingToken);


                if (expiredTokens.Any() || _settings.LogWhenNoTokensFound)
                    _logger.LogInformation("Found {Count} expired tokens.", expiredTokens.Count());

                foreach (var token in expiredTokens)
                {
                    _logger.LogInformation(
                      "Force logout for {User}: expired at {When}.",
                      token.Persoid, token.ExpiresRollingUtc);

                    await wsMgr.ForceLogoutAsync(token.Persoid.ToString(), "session-expired");
                    if (!await repo.DeleteTokenAsync(token.HashedToken, stoppingToken))
                        _logger.LogError("Failed to delete expired token {Token}.", token.HashedToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error scanning for expired tokens.");
            }

            if (_timeProvider.UtcNow - lastHeartbeat >= _heartbeatInterval)
            {
                _logger.LogInformation("ExpiredTokenScanner heartbeat: still alive.");
                lastHeartbeat = _timeProvider.UtcNow;
            }

            await Task.Delay(_scanInterval, stoppingToken);
        }

        _logger.LogInformation("ExpiredTokenScanner stopping.");
    }
}

