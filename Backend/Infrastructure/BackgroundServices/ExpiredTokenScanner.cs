using Backend.Application.Interfaces.WebSockets;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Settings;
using Microsoft.Extensions.Options;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;


public class ExpiredTokenScanner : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiredTokenScanner> _logger;
    private readonly TimeSpan _scanInterval;
    private readonly TimeSpan _heartbeatInterval;
    private readonly ExpiredTokenScannerSettings _settings;

    public ExpiredTokenScanner(
        IServiceScopeFactory scopeFactory,
        IOptions<ExpiredTokenScannerSettings> options,
        ILogger<ExpiredTokenScanner> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = options.Value;
        _scanInterval = TimeSpan.FromMinutes(_settings.ScanIntervalMinutes);
        _heartbeatInterval = TimeSpan.FromMinutes(_settings.HeartbeatIntervalMinutes);

        _logger.LogInformation(
          "ExpiredTokenScanner scan interval set to {Interval}, heartbeat interval set to {HeartbeatInterval}.",
           _scanInterval, _heartbeatInterval);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpiredTokenScanner started.");
        var lastHeartbeat = DateTime.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                // resolve everything from this scope:
                var userSql = scope.ServiceProvider.GetRequiredService<IUserSQLProvider>();
                var wsMgr = scope.ServiceProvider.GetRequiredService<IWebSocketManager>();

                // pull all expired tokens
                var expiredTokens = await userSql
                    .RefreshTokenSqlExecutor
                    .GetExpiredTokensAsync();

                if (expiredTokens.Any() || _settings.LogWhenNoTokensFound)
                    _logger.LogInformation("Found {Count} expired tokens.", expiredTokens.Count());

                foreach (var token in expiredTokens)
                {
                    _logger.LogInformation(
                      "Force logout for {User}: expired at {When}.",
                      token.Persoid, token.ExpiresRollingUtc);

                    await wsMgr.ForceLogoutAsync(token.Persoid.ToString(), "session-expired");
                    if (!await userSql.RefreshTokenSqlExecutor.DeleteTokenAsync(token.HashedToken))
                        _logger.LogError("Failed to delete expired token {Token}.", token.HashedToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error scanning for expired tokens.");
            }

            if (DateTime.UtcNow - lastHeartbeat >= _heartbeatInterval)
            {
                _logger.LogInformation("ExpiredTokenScanner heartbeat: still alive.");
                lastHeartbeat = DateTime.UtcNow;
            }

            await Task.Delay(_scanInterval, stoppingToken);
        }

        _logger.LogInformation("ExpiredTokenScanner stopping.");
    }
}

