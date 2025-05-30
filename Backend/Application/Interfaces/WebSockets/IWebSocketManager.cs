﻿using Backend.Infrastructure.WebSockets;
using System.Net.WebSockets;

namespace Backend.Application.Interfaces.WebSockets
{
    public interface IWebSocketManager
    {
        Task HandleConnectionAsync(WebSocket ws, Guid pid, Guid sid);
        Task SendMessageAsync(UserSessionKey key, string message);
        Task BroadcastAsync(string message);
        Task HealthCheckAsync();
        Task ForceLogoutAsync(string userId, string reason = "session-expired");
        int ActiveConnectionCount { get; }
    }
}
