﻿
using Backend.Application.Interfaces.WebSockets;
using Backend.Infrastructure.WebSockets;

namespace Backend.Infrastructure.BackgroundServices
{
    public class WebSocketHealthCheckService : BackgroundService
    {
        private readonly IWebSocketManager _wsManager;
        private readonly ILogger<WebSocketHealthCheckService> _logger;

        public WebSocketHealthCheckService(IWebSocketManager wsManager, ILogger<WebSocketHealthCheckService> logger)
        {
            _wsManager = wsManager;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("Running WebSocket healthcheck...");
                await _wsManager.HealthCheckAsync();
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); 
            }
        }
    }
}
