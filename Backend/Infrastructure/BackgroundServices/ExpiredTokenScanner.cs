using Backend.Application.Interfaces.WebSockets;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Entities;

public class ExpiredTokenScanner : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IWebSocketManager _webSocketManager;
    private readonly ILogger<ExpiredTokenScanner> _logger;
    private readonly TimeSpan _scanInterval = TimeSpan.FromSeconds(10); // adjust as needed

    public ExpiredTokenScanner(
        IServiceScopeFactory scopeFactory,
        IWebSocketManager webSocketManager,
        ILogger<ExpiredTokenScanner> logger)
    {
        _scopeFactory = scopeFactory;
        _webSocketManager = webSocketManager;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpiredTokenScanner started.");

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
                    _logger.LogInformation("Found {Count} expired tokens.", expiredTokens.Count());
                    foreach (var token in expiredTokens)
                    {
                        // Extract the user identifier from the token entity.
                        string userId = token.Persoid.ToString();

                        _logger.LogInformation($"Force logout for user {userId}: refresh token expired at {token.RefreshTokenExpiryDate}.");

                        // Notify the frontend via WebSocket
                        await _webSocketManager.ForceLogoutAsync(userId, "session-expired");
                        /*
                        bool deleteSuccess = await UserSQLProvider.RefreshTokenSqlExecutor.DeleteTokenAsync(token.RefreshToken);
                        if (!deleteSuccess) 
                            _logger.LogError($"Failed to delete expired token {token.RefreshToken} for user {userId}.");
                        */
                        
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while scanning for expired tokens.");
            }

            // Wait for the next scan interval (cancellation aware)
            await Task.Delay(_scanInterval, stoppingToken);
        }

        _logger.LogInformation("ExpiredTokenScanner stopping.");
    }
}
