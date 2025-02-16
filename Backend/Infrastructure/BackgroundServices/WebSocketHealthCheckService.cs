
using Backend.Application.Interfaces.WebSockets;
using Backend.Application.Settings;
using Backend.Infrastructure.WebSockets;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.BackgroundServices
{
    public class WebSocketHealthCheckService : BackgroundService
    {
        private readonly IWebSocketManager _wsManager;
        private readonly ILogger<WebSocketHealthCheckService> _logger;
        private readonly TimeSpan _interval;
        private readonly TimeSpan _heartbeatInterval;
        private readonly int _minActiveConnections;
        private readonly WebSocketHealthCheckSettings _settings;

        public WebSocketHealthCheckService(IWebSocketManager wsManager, IOptions<WebSocketHealthCheckSettings> options, ILogger<WebSocketHealthCheckService> logger)
        {
            _wsManager = wsManager;
            _logger = logger;
            _settings = options.Value; // Capture settings once.
            _interval = TimeSpan.FromSeconds(_settings.IntervalSeconds);
            _minActiveConnections = _settings.MinimumActiveConnections;
            _heartbeatInterval = TimeSpan.FromMinutes(_settings.HeartbeatIntervalMinutes);
            _logger.LogInformation("WebSocketHealthCheckSettings: IntervalSeconds={IntervalSeconds}, MinimumActiveConnections={MinActiveConnections}, HeartbeatIntervalMinutes={HeartbeatIntervalMinutes}",
                _settings.IntervalSeconds, _settings.MinimumActiveConnections, _settings.HeartbeatIntervalMinutes);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var lastHeartbeat = DateTime.UtcNow;
            while (!stoppingToken.IsCancellationRequested)
            {
                if (_wsManager.ActiveConnectionCount >= _minActiveConnections)
                {
                    _logger.LogInformation("Running WebSocket healthcheck...");
                    await _wsManager.HealthCheckAsync();
                }
                // Heartbeat: log every configured interval
                if (DateTime.UtcNow - lastHeartbeat >= _heartbeatInterval)
                {
                    _logger.LogInformation("WebSocketHealthCheckService heartbeat: I'm still alive, all is good!");
                    lastHeartbeat = DateTime.UtcNow;
                }
                await Task.Delay(_interval, stoppingToken);
            }
        }
    }
}
