using System.Net.WebSockets;

namespace Backend.Infrastructure.Interfaces
{
    public interface IWebSocketManager
    {
        Task HandleConnectionAsync(WebSocket webSocket, HttpContext context);
        Task SendMessageAsync(string userId, string message);
        Task BroadcastAsync(string message);
        Task HealthCheckAsync();
    }
}
