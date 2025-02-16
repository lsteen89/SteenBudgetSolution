using System.Net.WebSockets;

namespace Backend.Application.Interfaces.WebSockets
{
    public interface IWebSocketManager
    {
        Task HandleConnectionAsync(WebSocket webSocket, HttpContext context);
        Task SendMessageAsync(string userId, string message);
        Task BroadcastAsync(string message);
        Task HealthCheckAsync();
        Task ForceLogoutAsync(string userId, string reason = "session-expired");
        int ActiveConnectionCount { get; }
    }
}
