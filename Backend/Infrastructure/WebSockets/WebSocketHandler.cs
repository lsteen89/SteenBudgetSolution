using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Backend.Application.Interfaces.WebSockets;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Backend.Infrastructure.WebSockets
{
    public class WebSocketHandler : IWebSocketHandler
    {
        private readonly ILogger<WebSocketHandler> _logger;
        private readonly IWebSocketManager _wsManager; 

        public WebSocketHandler(
            ILogger<WebSocketHandler> logger,
            IWebSocketManager wsManager)
        {
            _logger = logger;
            _wsManager = wsManager;
        }

        public async Task HandleAsync(HttpContext context, WebSocket webSocket)
        {
            _logger.LogInformation("WebSocketHandler: delegating to WebSocketManager.");
            await _wsManager.HandleConnectionAsync(webSocket, context);
        }
    }
}
