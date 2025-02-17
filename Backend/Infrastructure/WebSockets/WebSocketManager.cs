﻿using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Backend.Application.Interfaces.WebSockets;
using Org.BouncyCastle.Tls;

namespace Backend.Infrastructure.WebSockets
{
    // Composite key to uniquely identify a user's session.
    public record UserSessionKey(string UserId, string SessionId);

    public record WebSocketConnection(WebSocket Socket, CancellationTokenSource Cts);

    public class WebSocketManager : IWebSocketManager, IHostedService
    {
        // Locks for synchronizing access per user.
        private readonly ConcurrentDictionary<string, SemaphoreSlim> _userLocks = new();

        // Stores connections keyed by composite (UserId, SessionId).
        private readonly ConcurrentDictionary<UserSessionKey, WebSocketConnection> _userSockets = new();

        // Optional: Map composite key to WebSocket for quick lookup.
        private readonly ConcurrentDictionary<string, WebSocket> _connections = new();

        private readonly ILogger<WebSocketManager> _logger;
        private const int MAX_MESSAGE_SIZE_BYTES = 4 * 1024; // 4 KB max message size.
        public int ActiveConnectionCount => _connections.Count;

        public WebSocketManager(ILogger<WebSocketManager> logger)
        {
            _logger = logger;
        }

        // IHostedService Start/Stop implementations.
        public Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("WebSocketManager started.");
            return Task.CompletedTask;
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("StopAsync invoked for WebSocketManager.");
            _logger.LogInformation($"Active connections: {_userSockets.Count}");

            var closeTasks = _userSockets.Values.Select(async conn =>
            {
                try
                {
                    conn.Cts.Cancel();
                    if (conn.Socket.State == WebSocketState.Open || conn.Socket.State == WebSocketState.CloseReceived)
                    {
                        using var closeCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                        try
                        {
                            await conn.Socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Server shutting down", closeCts.Token);
                            _logger.LogInformation("WebSocket closed gracefully.");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning($"Error closing socket: {ex.Message}. Aborting.");
                            conn.Socket.Abort();
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Error in StopAsync: {ex.Message}");
                }
            });

            await Task.WhenAll(closeTasks);

            // Clear all connections.
            foreach (var key in _userSockets.Keys.ToList())
            {
                _userSockets.TryRemove(key, out _);
            }
            await Task.Delay(1000, cancellationToken);
            _logger.LogInformation("All connections closed.");
        }

        // Main entry point for new WebSocket connections.
        public async Task HandleConnectionAsync(WebSocket webSocket, HttpContext context)
        {
            string userId = null;
            SemaphoreSlim userLock = null;
            UserSessionKey key = null;

            try
            {
                _logger.LogInformation("HandleConnectionAsync started.");
                var claims = context.User.Claims.Select(c => $"{c.Type}: {c.Value}").ToList();
                _logger.LogInformation("User claims: {Claims}", string.Join(", ", claims));

                if (!context.User.Identity.IsAuthenticated)
                {
                    _logger.LogWarning("Unauthenticated user. Closing WebSocket.");
                    await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Not authenticated", CancellationToken.None);
                    return;
                }

                // Extract required claims.
                var userIdClaim = context.User.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub);
                var sessionIdClaim = context.User.Claims.FirstOrDefault(c => c.Type == "sessionId");
                if (userIdClaim == null || sessionIdClaim == null)
                {
                    _logger.LogWarning(userIdClaim == null ? "User ID claim missing" : "Session ID claim missing");
                    await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Required claims missing", CancellationToken.None);
                    return;
                }

                userId = userIdClaim.Value;
                key = new UserSessionKey(userId, sessionIdClaim.Value);
                _logger.LogInformation($"User {userId} (session: {key.SessionId}) connected.");

                // Acquire a lock for this user.
                userLock = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
                await userLock.WaitAsync();

                try
                {
                    // If the connection for this session exists, replace it.
                    if (_userSockets.TryGetValue(key, out var oldConn))
                    {
                        _logger.LogWarning($"Existing connection for user {userId} session {key.SessionId} found, replacing it.");
                        _userSockets.TryRemove(key, out _);
                        oldConn.Cts.Cancel();
                        if (oldConn.Socket.State == WebSocketState.Open)
                        {
                            try
                            {
                                await oldConn.Socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Replaced by new connection", CancellationToken.None);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning($"Error closing old socket: {ex.Message}. Aborting.");
                                oldConn.Socket.Abort();
                            }
                        }
                    }

                    // Add the new connection.
                    var cts = new CancellationTokenSource();
                    var newConn = new WebSocketConnection(webSocket, cts);
                    if (!_userSockets.TryAdd(key, newConn))
                    {
                        _logger.LogWarning($"Failed to add connection for user {userId} session {key.SessionId}.");
                        await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Connection add failure", CancellationToken.None);
                        return;
                    }
                    _connections.TryAdd(key.ToString(), webSocket);

                    _logger.LogInformation($"WebSocket connection established for user {userId} session {key.SessionId}.");
                    await SendMessageAsync(key, "ready");
                }
                finally
                {
                    userLock.Release();
                }

                // Start the read loop.
                await ReadLoopAsync(key, webSocket);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in HandleConnectionAsync for user {userId}: {ex.Message}");
            }
            finally
            {
                _logger.LogDebug($"Cleaning up connection for user {userId} session {key?.SessionId}.");
                if (key != null)
                {
                    await userLock.WaitAsync();
                    try
                    {
                        if (_userSockets.TryGetValue(key, out var currentConn) && currentConn.Socket == webSocket)
                        {
                            _userSockets.TryRemove(key, out _);
                            _logger.LogInformation($"Removed connection for user {userId} session {key.SessionId} during cleanup.");
                            if (webSocket.State == WebSocketState.Open || webSocket.State == WebSocketState.CloseReceived)
                            {
                                try
                                {
                                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Cleanup closing", CancellationToken.None);
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError($"Error closing during cleanup: {ex.Message}");
                                }
                            }
                        }
                    }
                    finally
                    {
                        userLock.Release();
                        _connections.TryRemove(key.ToString(), out _);
                    }
                }
                _logger.LogDebug($"Cleanup complete for user {userId} session {key?.SessionId}.");
            }
        }

        // Continuously reads messages from the socket.
        private async Task ReadLoopAsync(UserSessionKey key, WebSocket socket)
        {
            if (!_userSockets.TryGetValue(key, out var conn))
                return;

            var cts = conn.Cts;
            var token = cts.Token;
            var buffer = new byte[1024];

            using var ms = new MemoryStream();
            try
            {
                while (socket.State == WebSocketState.Open && !token.IsCancellationRequested)
                {
                    WebSocketReceiveResult result;
                    try
                    {
                        result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
                    }
                    catch (OperationCanceledException)
                    {
                        _logger.LogInformation($"Read loop canceled for user {key.UserId} session {key.SessionId}.");
                        break;
                    }
                    catch (WebSocketException ex)
                    {
                        _logger.LogError($"WebSocket error for user {key.UserId} session {key.SessionId}: {ex.Message}");
                        break;
                    }

                    if (result.CloseStatus.HasValue)
                    {
                        _logger.LogInformation($"Socket closed for user {key.UserId} session {key.SessionId} with status {result.CloseStatus}.");
                        break;
                    }

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        ms.Write(buffer, 0, result.Count);
                        if (ms.Length > MAX_MESSAGE_SIZE_BYTES)
                        {
                            _logger.LogWarning($"Message too large from user {key.UserId} session {key.SessionId}. Closing.");
                            await socket.CloseAsync(WebSocketCloseStatus.MessageTooBig, "Message too big", token);
                            break;
                        }
                        if (result.EndOfMessage)
                        {
                            var message = Encoding.UTF8.GetString(ms.ToArray());
                            ms.SetLength(0);
                            _logger.LogInformation($"Received from user {key.UserId} session {key.SessionId}: {message}");
                            await SendMessageAsync(key, $"Echo: {message}");
                        }
                    }
                    else
                    {
                        _logger.LogWarning($"Non-text message received from user {key.UserId} session {key.SessionId}. Closing.");
                        await socket.CloseAsync(WebSocketCloseStatus.InvalidMessageType, "Only text supported", token);
                        break;
                    }
                }
            }
            finally
            {
                _logger.LogDebug($"Exiting read loop for user {key.UserId} session {key.SessionId}. Socket state: {socket.State}");
            }
        }

        // Sends a message to a specific connection identified by the composite key.
        public async Task SendMessageAsync(UserSessionKey key, string message)
        {
            if (_userSockets.TryGetValue(key, out var conn) && conn.Socket.State == WebSocketState.Open)
            {
                var bytes = Encoding.UTF8.GetBytes(message);
                try
                {
                    _logger.LogInformation($"Sending to user {key.UserId} session {key.SessionId}: {message}");
                    await conn.Socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                }
                catch (WebSocketException ex)
                {
                    _logger.LogError($"Send failed for user {key.UserId} session {key.SessionId}: {ex.Message}");
                }
            }
            else
            {
                _logger.LogWarning($"Socket not available for user {key.UserId} session {key.SessionId}.");
            }
        }

        // Broadcasts a message to all connections.
        public async Task BroadcastAsync(string message)
        {
            var tasks = _userSockets.Select(kvp => SendMessageAsync(kvp.Key, message));
            await Task.WhenAll(tasks);
        }

        // Performs a health check by sending a ping message.
        public async Task HealthCheckAsync()
        {
            foreach (var kvp in _userSockets)
            {
                var key = kvp.Key;
                var conn = kvp.Value;
                if (conn.Socket.State != WebSocketState.Open)
                    continue;

                try
                {
                    await SendMessageAsync(key, "ping");
                    _logger.LogInformation($"Ping sent to user {key.UserId} session {key.SessionId}.");
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Health check failed for user {key.UserId} session {key.SessionId}: {ex.Message}. Closing.");
                    try
                    {
                        await conn.Socket.CloseAsync(WebSocketCloseStatus.EndpointUnavailable, "Health check failed", CancellationToken.None);
                    }
                    catch { conn.Socket.Abort(); }
                    _userSockets.TryRemove(key, out _);
                }
            }
        }

        // Force logout for all sessions of a given user.
        public async Task ForceLogoutAsync(string userId, string reason = "session-expired")
        {
            var keysToRemove = _userSockets.Keys.Where(k => k.UserId == userId).ToList();
            foreach (var key in keysToRemove)
            {
                if (_userSockets.TryGetValue(key, out var conn) &&
                    (conn.Socket.State == WebSocketState.Open || conn.Socket.State == WebSocketState.CloseReceived))
                {
                    var bytes = Encoding.UTF8.GetBytes(reason);
                    try
                    {
                        _logger.LogInformation($"Force logout: sending to user {key.UserId} session {key.SessionId}: {reason}");
                        await conn.Socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                    }
                    catch (WebSocketException ex)
                    {
                        _logger.LogError($"Force logout send error for user {key.UserId} session {key.SessionId}: {ex.Message}");
                    }
                    try
                    {
                        using var closeCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                        await conn.Socket.CloseAsync(WebSocketCloseStatus.NormalClosure, reason, closeCts.Token);
                        _logger.LogInformation($"User {key.UserId} session {key.SessionId} logged out gracefully.");
                    }
                    catch (TaskCanceledException ex)
                    {
                        _logger.LogWarning($"Graceful logout timed out for user {key.UserId} session {key.SessionId}: {ex.Message}. Aborting.");
                        conn.Socket.Abort();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Error during graceful logout for user {key.UserId} session {key.SessionId}: {ex.Message}. Aborting.");
                        conn.Socket.Abort();
                    }
                    _userSockets.TryRemove(key, out _);
                }
            }
        }
    }
}
