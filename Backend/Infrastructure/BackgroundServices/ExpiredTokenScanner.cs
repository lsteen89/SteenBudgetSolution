using Backend.Application.Interfaces.WebSockets;
using Backend.Application.Settings;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Entities;
using Microsoft.Extensions.Options;

public class ExpiredTokenScanner : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IWebSocketManager _webSocketManager;
    private readonly ILogger<ExpiredTokenScanner> _logger;
    private readonly TimeSpan _scanInterval;
    private readonly TimeSpan _heartbeatInterval;
    private readonly ExpiredTokenScannerSettings _settings;

    public ExpiredTokenScanner(
        IServiceScopeFactory scopeFactory,
        IWebSocketManager webSocketManager,
        ILogger<ExpiredTokenScanner> logger,
        IOptions<ExpiredTokenScannerSettings> options)

    {
        _scopeFactory = scopeFactory;
        _webSocketManager = webSocketManager;
        _logger = logger;
        _settings = options.Value;
        _scanInterval = TimeSpan.FromMinutes(options.Value.ScanIntervalMinutes);
        _heartbeatInterval = TimeSpan.FromMinutes(_settings.HeartbeatIntervalMinutes);
        _logger.LogInformation("ExpiredTokenScanner scan interval set to {Interval}, heartbeat interval set to {HeartbeatInterval}.", _scanInterval, _heartbeatInterval);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpiredTokenScanner started.");
        var lastHeartbeat = DateTime.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Create a new scope for this iteration
                using (var scope = _scopeFactory.CreateScope())
                {
                    var UserSQLProvider = scope.ServiceProvider.GetRequiredService<IUserSQLProvider>();

                    // Retrieve all expired refresh tokens.
                    IEnumerable<RefreshJwtTokenEntity> expiredTokens = await UserSQLProvider.RefreshTokenSqlExecutor.GetExpiredTokensAsync();

                    // Log the number of expired tokens found if any
                    if (expiredTokens.Any() || _settings.LogWhenNoTokensFound)
                    {
                        _logger.LogInformation("Found {Count} expired tokens.", expiredTokens.Count());
                    }

                    foreach (var token in expiredTokens)
                    {
                        // Extract the user identifier from the token entity.
                        string userId = token.Persoid.ToString();

                        _logger.LogInformation($"Force logout for user {userId}: refresh token expired at {token.RefreshTokenExpiryDate}.");

                        // Notify the frontend via WebSocket
                        await _webSocketManager.ForceLogoutAsync(userId, "session-expired");

                        // Delete the expired token
                        bool deleteSuccess = await UserSQLProvider.RefreshTokenSqlExecutor.DeleteTokenAsync(token.RefreshToken);
                        if (!deleteSuccess) 
                            _logger.LogError($"Failed to delete expired token {token.RefreshToken} for user {userId}.");
                        
                        
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while scanning for expired tokens.");
            }

            // Heartbeat: log every configured interval
            if (DateTime.UtcNow - lastHeartbeat >= _heartbeatInterval)
            {
                _logger.LogInformation("ExpiredTokenScanner heartbeat: I'm still alive, all is good!");
                lastHeartbeat = DateTime.UtcNow;
            }
            // Wait for the next scan interval (cancellation aware)
            await Task.Delay(_scanInterval, stoppingToken);
        }

        _logger.LogInformation("ExpiredTokenScanner stopping.");
    }
}
