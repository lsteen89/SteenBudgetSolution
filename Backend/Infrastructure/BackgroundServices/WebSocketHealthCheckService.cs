
using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.BackgroundServices
{
    public class WebSocketHealthCheckService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<WebSocketHealthCheckService> _logger;
        private readonly ITimeProvider _timeProvider;
        private readonly TimeSpan _interval;
        private readonly TimeSpan _heartbeatInterval;
        private readonly int _minActiveConnections;

        public WebSocketHealthCheckService(
            IOptions<WebSocketHealthCheckSettings> options,
            ILogger<WebSocketHealthCheckService> logger,
            IServiceScopeFactory scopeFactory,
            ITimeProvider timeProvider)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
            _timeProvider = timeProvider;

            var settings = options.Value;
            _interval = TimeSpan.FromSeconds(settings.IntervalSeconds);
            _heartbeatInterval = TimeSpan.FromMinutes(settings.HeartbeatIntervalMinutes);
            _minActiveConnections = settings.MinimumActiveConnections;

            _logger.LogInformation(
                "WebSocketHealthCheckSettings: IntervalSeconds={IntervalSeconds}, MinimumActiveConnections={MinActiveConnections}, HeartbeatIntervalMinutes={HeartbeatIntervalMinutes}",
                settings.IntervalSeconds,
                settings.MinimumActiveConnections,
                settings.HeartbeatIntervalMinutes);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var lastHeartbeat = _timeProvider.UtcNow;

            while (!stoppingToken.IsCancellationRequested)
            {
                // 1) open a scope and resolve IWebSocketManager
                using var scope = _scopeFactory.CreateScope();
                var wsMgr = scope.ServiceProvider.GetRequiredService<IWebSocketManager>();

                // 2) only run health-check if we have enough connections
                if (wsMgr.ActiveConnectionCount >= _minActiveConnections)
                {
                    _logger.LogInformation("Running WebSocket healthcheck...");
                    await wsMgr.HealthCheckAsync();
                }

                // 3) periodic heartbeat log
                if (_timeProvider.UtcNow - lastHeartbeat >= _heartbeatInterval)
                {
                    _logger.LogInformation("WebSocketHealthCheckService heartbeat: I'm still alive, all is good!");
                    lastHeartbeat = _timeProvider.UtcNow;
                }

                await Task.Delay(_interval, stoppingToken);
            }
        }
    }
}
