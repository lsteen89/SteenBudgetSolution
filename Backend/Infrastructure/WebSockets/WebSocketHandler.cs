using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Backend.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Backend.Infrastructure.WebSockets
{
    public class WebSocketHandler : IWebSocketHandler
    {
        private readonly ILogger<WebSocketHandler> _logger;

        public WebSocketHandler(ILogger<WebSocketHandler> logger)
        {
            _logger = logger;
        }

        public async Task HandleAsync(HttpContext context, WebSocket webSocket)
        {
            var buffer = new byte[1024 * 4];
            _logger.LogInformation("WebSocket connection established.");

            while (webSocket.State == WebSocketState.Open)
            {
                try
                {
                    var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        _logger.LogInformation("WebSocket connection closing.");
                        await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                    }
                    else if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        _logger.LogInformation($"Received message: {message}");

                        if (message.Equals("logout", StringComparison.OrdinalIgnoreCase))
                        {
                            var response = Encoding.UTF8.GetBytes("LOGOUT");
                            await webSocket.SendAsync(new ArraySegment<byte>(response), WebSocketMessageType.Text, true, CancellationToken.None);
                            _logger.LogInformation("Sent LOGOUT response.");
                        }

                        // Handle other messages as needed
                    }
                    // Handle other message types if necessary
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while handling WebSocket connection.");
                    break;
                }
            }

            _logger.LogInformation("WebSocket connection closed.");
        }
    }
}
