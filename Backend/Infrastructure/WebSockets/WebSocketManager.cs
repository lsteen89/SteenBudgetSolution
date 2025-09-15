using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Settings;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Claims;
using System.Text;
using Backend.Application.Abstractions.Infrastructure.System;


namespace Backend.Infrastructure.WebSockets
{
    // Composite key to uniquely identify a user's session.
    public record UserSessionKey(Guid Persoid, Guid SessionId);

    public record WebSocketConnection(WebSocket Socket, CancellationTokenSource Cts)
    {
        public ClaimsPrincipal? Principal { get; set; }
        // DateTime for keeping track of last message recieved from FE
        public DateTime LastPongTime { get; set; } = DateTime.UtcNow;
        public int MissedPongCount { get; set; } = 0;

        // Flags for tracking ping/pong status
        public bool PendingPing { get; set; } = false;
        public DateTime? PingSentTime { get; set; } = null;
    }

    public class WebSocketManager : IWebSocketManager, IHostedService
    {
        public Task HandleConnectionAsync(WebSocket ws, Guid pid, Guid sid, CancellationToken ct) =>
            HandleConnectionAsync(ws, new DefaultHttpContext(), pid, sid, ct);
        // Locks for synchronizing access per user.
        private readonly ConcurrentDictionary<string, SemaphoreSlim> _userLocks = new();

        // Stores connections keyed by composite (Persoid, SessionId).
        private readonly ConcurrentDictionary<UserSessionKey, WebSocketConnection> _userSockets = new();

        // Optional: Map composite key to WebSocket for quick lookup.
        private readonly ConcurrentDictionary<string, WebSocket> _connections = new();

        private readonly ILogger<WebSocketManager> _logger;
        private const int MAX_MESSAGE_SIZE_BYTES = 4 * 1024; // 4 KB max message size.
        public int ActiveConnectionCount => _connections.Count;

        private readonly WebSocketHealthCheckSettings _settings;
        private int _missedPongThreshold;
        private bool _logoutOnStaleConnection;
        private TimeSpan _pongTimeout;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ITimeProvider _time;
        private readonly IWebHostEnvironment _env;

        public WebSocketManager(ILogger<WebSocketManager> logger, IOptions<WebSocketHealthCheckSettings> options, ITimeProvider time, IServiceScopeFactory scopeFactory, IWebHostEnvironment env)
        {
            _logger = logger;
            _settings = options.Value;
            _time = time;
            _missedPongThreshold = _settings.MissedPongThreshold;
            _logoutOnStaleConnection = _settings.LogoutOnStaleConnection;
            _pongTimeout = _settings.PongTimeout;
            _scopeFactory = scopeFactory;
            _env = env;
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
        private async Task HandleConnectionAsync(
                WebSocket webSocket,
                HttpContext context,
                Guid persoid,
                Guid sessionId,
                CancellationToken ct)
        {
            SemaphoreSlim? userLock = null;
            UserSessionKey? key = null;

            try
            {
                _logger.LogInformation("HandleConnectionAsync starting handshake…");

                /* ── 4) success → continue with connection registration ─────────────── */
                key = new UserSessionKey(persoid, sessionId);
                _logger.LogInformation("WS OK: user {UserId}, session {SessionId}",
                                       persoid, sessionId);

                /* ── 5) acquire per-user lock and register / replace connection ─────── */
                userLock = _userLocks.GetOrAdd(persoid.ToString(),
                                               _ => new SemaphoreSlim(1, 1));

                //await userLock.WaitAsync(context.RequestAborted);
                await userLock.WaitAsync();

                try
                {
                    if (_userSockets.TryGetValue(key, out var oldConn))
                    {
                        _logger.LogWarning("Replacing existing connection for {Key}", key);
                        _userSockets.TryRemove(key, out _);
                        oldConn.Cts.Cancel();
                        if (oldConn.Socket.State == WebSocketState.Open)
                        {
                            try
                            {
                                await oldConn.Socket.CloseAsync(
                                    WebSocketCloseStatus.NormalClosure,
                                    "Replaced by new connection",
                                    CancellationToken.None);
                            }
                            catch
                            {
                                oldConn.Socket.Abort();
                            }
                        }
                    }

                    var cts = new CancellationTokenSource();
                    var newConn = new WebSocketConnection(webSocket, cts);
                    if (!_userSockets.TryAdd(key, newConn))
                    {
                        _logger.LogWarning("Failed to add connection for {Key}", key);
                        await webSocket.CloseAsync(
                            WebSocketCloseStatus.InternalServerError,
                            "Connection add failure",
                            CancellationToken.None);
                        return;
                    }
                    _connections.TryAdd(key.ToString(), webSocket);

                    _logger.LogInformation("WebSocket connection established for {Key}", key);
                    LogActiveConnections();
                    await SendMessageAsync(key, "ready");
                }
                finally
                {
                    userLock.Release();
                }

                // 7) Enter your read-loop…
                await ReadLoopAsync(key, webSocket, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in HandleConnectionAsync for user {key!.Persoid}: {ex.Message}");
            }
            finally
            {
                if (key == null)
                {
                    _logger.LogDebug("Cleaning up connection that failed before authentication completed.");

                }
                else if (key != null)
                {
                    await userLock!.WaitAsync();
                    try
                    {
                        if (_userSockets.TryGetValue(key, out var currentConn) && currentConn.Socket == webSocket)
                        {
                            _userSockets.TryRemove(key, out _);
                            _logger.LogInformation($"Removed connection for user {key.Persoid} session {key.SessionId} during cleanup.");
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
                _logger.LogDebug($"Cleanup complete for user {key?.Persoid} session {key?.SessionId}.");
                _logger.LogInformation($"WebSocket disonnect for user {key?.Persoid} session {key?.SessionId}.");
                LogActiveConnections();
            }
        }

        // Continuously reads messages from the socket.

        private async Task ReadLoopAsync(UserSessionKey key, WebSocket socket, CancellationToken ct)
        {
            if (!_userSockets.TryGetValue(key, out var conn))
            {
                _logger.LogWarning($"[WS SVR] Attempted to start ReadLoop for non-existent connection: User: {key.Persoid}, Session: {key.SessionId}");
                return;
            }

            var cts = conn.Cts;
            var token = cts.Token;
            // Consider making buffer size configurable or dynamically sized if messages can vary wildly
            // and 1024 is not always optimal, though it's a common starting point.
            var buffer = new byte[1024];

            using var ms = new MemoryStream();
            _logger.LogDebug($"[WS SVR] Starting ReadLoop for User: {key.Persoid}, Session: {key.SessionId}");

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
                        _logger.LogInformation($"[WS SVR] Read loop canceled for User: {key.Persoid}, Session: {key.SessionId}.");
                        break;
                    }
                    catch (WebSocketException ex)
                    {
                        // Log the full exception for better diagnostics
                        _logger.LogError(ex, $"[WS SVR] WebSocket error during read for User: {key.Persoid}, Session: {key.SessionId}. ErrorCode: {ex.WebSocketErrorCode}");
                        break;
                    }

                    if (result.CloseStatus.HasValue)
                    {
                        _logger.LogInformation($"[WS SVR] Socket close frame received for User: {key.Persoid}, Session: {key.SessionId}. Status: {result.CloseStatus}, Description: \"{result.CloseStatusDescription}\"");
                        break;
                    }

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        ms.Write(buffer, 0, result.Count);
                        if (ms.Length > MAX_MESSAGE_SIZE_BYTES)
                        {
                            _logger.LogWarning($"[WS SVR] Message too large from User: {key.Persoid}, Session: {key.SessionId} (Size: {ms.Length} bytes > MAX: {MAX_MESSAGE_SIZE_BYTES}). Closing connection.");
                            await socket.CloseAsync(WebSocketCloseStatus.MessageTooBig, "Message too big", token);
                            break;
                        }

                        if (result.EndOfMessage)
                        {
                            var receivedMessage = Encoding.UTF8.GetString(ms.ToArray());
                            ms.SetLength(0); // Reset MemoryStream for the next message

                            _logger.LogDebug($"[WS SVR ← RECEIVED FROM User: {key.Persoid}, Session: {key.SessionId}] Body: \"{receivedMessage}\"");

                            // --- Handle known client messages ---
                            if (receivedMessage.Equals("logout", StringComparison.OrdinalIgnoreCase))
                            {
                                const string responseMessage = "LOGOUT";
                                _logger.LogDebug($"[WS SVR → SENDING TO User: {key.Persoid}, Session: {key.SessionId}] Body: \"{responseMessage}\"");
                                await SendMessageAsync(key, responseMessage);
                                // The client is expected to close the connection upon receiving "LOGOUT".
                                // You might also initiate server-side cleanup or await client closure here.
                                // The 'continue' assumes the client will close, or another part of your system handles session termination.
                                continue;
                            }
                            // This pattern is something we should implement for all messages 
                            // Make readloop orchestrate the handling of messages
                            // And call the appropriate handler method based on the message type.
                            else if (receivedMessage.Equals("pong", StringComparison.OrdinalIgnoreCase))
                            {
                                HandlePong(key, conn);

                                // Update other connection-specific flags directly on 'conn'
                                // These are correctly placed here as they are direct consequences of receiving a valid pong.
                                conn.PendingPing = false;
                                conn.MissedPongCount = 0;

                                _logger.LogDebug($"[WS SVR] Pong processing complete for User: {key.Persoid}, Session: {key.SessionId}. PendingPing cleared, MissedPongs reset.");
                                continue;
                            }
                            else if (receivedMessage.StartsWith("AUTH-REFRESH ", StringComparison.OrdinalIgnoreCase))
                            {
                                var jwtRaw = receivedMessage["AUTH-REFRESH ".Length..];

                                string? kid = null;
                                try
                                {
                                    // Optional: log kid to debug key-ring mismatches
                                    try
                                    {
                                        var hdr = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler()
                                                    .ReadJwtToken(jwtRaw).Header;
                                        kid = hdr.Kid;
                                    }
                                    catch { /* ignore parse/logging errors */ }

                                    await using var scope = _scopeFactory.CreateAsyncScope();
                                    var jwtSvc = scope.ServiceProvider.GetRequiredService<IJwtService>();

                                    // Choose policy: allowExpired=false is stricter; true is okay if you only use this to reattach identity.
                                    var principal = jwtSvc.ValidateToken(jwtRaw, ct: ct, allowExpired: false);

                                    if (principal is not null)
                                    {
                                        conn.Principal = principal;
                                        _logger.LogInformation("[WS SVR] AUTH-REFRESH ok uid={Uid} sid={Sid} kid={Kid}", key.Persoid, key.SessionId, kid);
                                        await SafeSendAsync(key, "reauth-ok");
                                    }
                                    else
                                    {
                                        _logger.LogWarning("[WS SVR] AUTH-REFRESH fail (invalid) uid={Uid} sid={Sid} kid={Kid}", key.Persoid, key.SessionId, kid);
                                        await SafeSendAsync(key, "reauth-fail");
                                    }
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, "[WS SVR] AUTH-REFRESH crashed uid={Uid} sid={Sid} kid={Kid}", key.Persoid, key.SessionId, kid);
                                    await SafeSendAsync(key, "reauth-fail");
                                    // DO NOT rethrow — keeps the socket alive; loop continues
                                }

                                continue;
                            }
                            else // --- This is the path for messages not matching "logout", "pong", or "AUTH-REFRESH" ---
                            {
                                // TODO: Today current code implicitly echoes these messages. Might refactor in future.
                                var echoResponseMessage = $"Echo: {receivedMessage}";
                                _logger.LogDebug($"[WS SVR ? UNHANDLED (echoing) FROM User: {key.Persoid}, Session: {key.SessionId}] Body: \"{receivedMessage}\"");
                                _logger.LogDebug($"[WS SVR → SENDING TO User: {key.Persoid}, Session: {key.SessionId}] Body: \"{echoResponseMessage}\"");
                                await SendMessageAsync(key, echoResponseMessage);
                            }
                        }
                    }
                    else if (result.MessageType == WebSocketMessageType.Binary)
                    {
                        _logger.LogWarning($"[WS SVR ? UNHANDLED NON-TEXT FROM User: {key.Persoid}, Session: {key.SessionId}] Type: Binary, Size: {result.Count} bytes. Closing connection as binary is not supported.");
                        await socket.CloseAsync(WebSocketCloseStatus.InvalidMessageType, "Binary messages are not supported.", token);
                        break;
                    }
                    // Implicitly, other WebSocketMessageTypes (like Close handled above) are not processed here.
                }
            }
            catch (Exception ex) // Catch-all for any other unexpected errors within the ReadLoop's main try block
            {
                _logger.LogError(ex, $"[WS SVR] CRITICAL UNHANDLED EXCEPTION in ReadLoopAsync for User: {key.Persoid}, Session: {key.SessionId}.");
                // Attempt a graceful close if the socket appears to be in a state where that's possible
                if (socket.State == WebSocketState.Open || socket.State == WebSocketState.CloseReceived)
                {
                    try
                    {
                        await socket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Critical server error in read loop.", CancellationToken.None); // Use a non-loop token for final close
                    }
                    catch (Exception closeEx)
                    {
                        _logger.LogError(closeEx, $"[WS SVR] Exception during CRITICAL error cleanup close for User: {key.Persoid}, Session: {key.SessionId}.");
                    }
                }
            }
            finally
            {
                ms.Dispose();
                _logger.LogInformation($"[WS SVR] Exiting ReadLoop for User: {key.Persoid}, Session: {key.SessionId}. Final socket state: {socket.State}");
                // TODO: 
                // Note: The actual removal of 'key' from '_userSockets' and disposal of 'conn.Cts'
                // should typically happen in the method that calls ReadLoopAsync (e.g., HandleConnectionAsync)
                // after ReadLoopAsync completes or throws an exception, to ensure proper cleanup.
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
                    _logger.LogDebug($"Sending to user {key.Persoid} session {key.SessionId}: {message}");
                    await conn.Socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                }
                catch (WebSocketException ex)
                {
                    _logger.LogError($"Send failed for user {key.Persoid} session {key.SessionId}: {ex.Message}");
                }
            }
            else
            {
                _logger.LogWarning($"Socket not available for user {key.Persoid} session {key.SessionId}.");
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

                // Skip connections that are not open
                if (conn.Socket.State != WebSocketState.Open)
                    continue;

                // If a ping is pending, check if it has timed out
                if (conn.PendingPing && conn.PingSentTime.HasValue)
                {
                    if (DateTime.UtcNow - conn.PingSentTime.Value > _pongTimeout)
                    {
                        conn.MissedPongCount++;
                        _logger.LogWarning($"User {key.Persoid} session {key.SessionId} missed pong count: {conn.MissedPongCount}");

                        // If the missed count exceeds the threshold, close the connection
                        if (conn.MissedPongCount >= _missedPongThreshold)
                        {
                            _logger.LogWarning($"User {key.Persoid} session {key.SessionId} has missed pong {conn.MissedPongCount} times (threshold: {_missedPongThreshold}), closing.");
                            try
                            {
                                _logger.LogInformation($"[CLOSE] About to call CloseAsync for user {key.Persoid} session {key.SessionId}.");
                                using var closeCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                                await conn.Socket.CloseAsync(WebSocketCloseStatus.EndpointUnavailable, "No pong received", closeCts.Token);
                                _logger.LogInformation($"[CLOSE] Called CloseAsync. Socket state: {conn.Socket.State}");
                            }
                            catch (OperationCanceledException)
                            {
                                _logger.LogWarning("CloseAsync timed out, aborting socket.");
                                conn.Socket.Abort();
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning($"Error closing stale socket: {ex.Message}. Aborting.");
                                conn.Socket.Abort();
                            }
                            _userSockets.TryRemove(key, out _);
                            continue;
                        }
                    }
                }
                else
                {
                    // If no ping is pending, reset the missed count (optional)
                    conn.MissedPongCount = 0;
                }

                // If the socket is open and no ping is currently pending, send a ping
                if (!conn.PendingPing)
                {
                    // Mark the connection as pending and record the time
                    conn.PendingPing = true;
                    conn.PingSentTime = DateTime.UtcNow;

                    try
                    {
                        await SendMessageAsync(key, "ping");
                        _logger.LogDebug($"Ping sent to user {key.Persoid} session {key.SessionId}.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Ping failed for user {key.Persoid} session {key.SessionId}: {ex.Message}. Closing.");
                        try
                        {
                            await conn.Socket.CloseAsync(WebSocketCloseStatus.EndpointUnavailable, "Health check failed", CancellationToken.None);
                        }
                        catch { conn.Socket.Abort(); }
                        _userSockets.TryRemove(key, out _);
                    }
                }
            }
        }


        // Force logout for all sessions of a given user.
        public async Task ForceLogoutAsync(string Persoid, string reason = "session-expired")
        {
            var keysToRemove = _userSockets.Keys.Where(k => k.Persoid.ToString() == Persoid).ToList();
            foreach (var key in keysToRemove)
            {
                if (_userSockets.TryGetValue(key, out var conn) &&
                    (conn.Socket.State == WebSocketState.Open || conn.Socket.State == WebSocketState.CloseReceived))
                {
                    var bytes = Encoding.UTF8.GetBytes(reason);
                    try
                    {
                        _logger.LogInformation($"Force logout: sending to user {key.Persoid} session {key.SessionId}: {reason}");
                        await conn.Socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                    }
                    catch (WebSocketException ex)
                    {
                        _logger.LogError($"Force logout send error for user {key.Persoid} session {key.SessionId}: {ex.Message}");
                    }
                    try
                    {
                        using var closeCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                        await conn.Socket.CloseAsync(WebSocketCloseStatus.NormalClosure, reason, closeCts.Token);
                        _logger.LogInformation($"User {key.Persoid} session {key.SessionId} logged out gracefully.");
                    }
                    catch (TaskCanceledException ex)
                    {
                        _logger.LogWarning($"Graceful logout timed out for user {key.Persoid} session {key.SessionId}: {ex.Message}. Aborting.");
                        conn.Socket.Abort();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Error during graceful logout for user {key.Persoid} session {key.SessionId}: {ex.Message}. Aborting.");
                        conn.Socket.Abort();
                    }
                    _userSockets.TryRemove(key, out _);
                }
            }
        }
        #region Helpers
        private void LogActiveConnections()
        {
            // Log the total number of unique connections (by composite key).
            _logger.LogInformation("Active unique WebSocket connections: {UniqueCount}", _userSockets.Count);

            // Group connections by user and log counts per user.
            var groupedConnections = _userSockets
                .GroupBy(kvp => kvp.Key.Persoid)
                .ToDictionary(g => g.Key, g => g.Count());
            _logger.LogInformation("Active connections grouped by user: {@GroupedConnections}", groupedConnections);
        }
        private void HandlePong(UserSessionKey key, WebSocketConnection conn)
        {

            // The 'scope' and the 'timeProvider' instance obtained from it are disposed of here.

            var now = _time.UtcNow;
            conn.LastPongTime = now;

            if (conn.PingSentTime.HasValue)
            {
                DateTime pingSentAt = conn.PingSentTime.Value;
                TimeSpan latency = now - pingSentAt;

                _logger.LogDebug($"[WS SVR] Pong received from User: {key.Persoid}, Session: {key.SessionId}. Latency: {latency.TotalMilliseconds:F0}ms");
            }
            else
            {
                _logger.LogWarning($"[WS SVR] Pong received from User: {key.Persoid}, Session: {key.SessionId}, but no corresponding PingSentTime was recorded on the connection.");
            }
        }
        private async Task SafeSendAsync(UserSessionKey key, string message)
        {
            try
            {
                await SendMessageAsync(key, message);
            }
            catch (OperationCanceledException) { /* client gone; ignore */ }
            catch (System.Net.WebSockets.WebSocketException wse)
            {
                _logger.LogWarning(wse, "[WS SVR] send failed uid={Uid} sid={Sid}", key.Persoid, key.SessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[WS SVR] send failed uid={Uid} sid={Sid}", key.Persoid, key.SessionId);
            }
        }
        #endregion
    }
}
