
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
        private readonly int _minActiveConnections;

        public WebSocketHealthCheckService(IWebSocketManager wsManager, IOptions<WebSocketHealthCheckSettings> options, ILogger<WebSocketHealthCheckService> logger)
        {
            _wsManager = wsManager;
            _logger = logger;
            var settings = options.Value;
            _interval = TimeSpan.FromSeconds(settings.IntervalSeconds);
            _minActiveConnections = settings.MinimumActiveConnections;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (_wsManager.ActiveConnectionCount >= _minActiveConnections)
                {
                    _logger.LogInformation("Running WebSocket healthcheck...");
                    await _wsManager.HealthCheckAsync();
                }
                await Task.Delay(_interval, stoppingToken);
            }
        }
    }
}
