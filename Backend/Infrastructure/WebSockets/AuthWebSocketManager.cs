using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Backend.Infrastructure.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Backend.Infrastructure.WebSockets
{
    public record WebSocketConnection(WebSocket Socket, CancellationTokenSource Cts);
    public class AuthWebSocketManager : IWebSocketManager, IHostedService
    {
        private readonly ConcurrentDictionary<string, SemaphoreSlim> _userLocks = new();
        private readonly ConcurrentDictionary<string, WebSocketConnection> _userSockets = new();
        private readonly ILogger<AuthWebSocketManager> _logger;
        private const int MAX_MESSAGE_SIZE_BYTES = 4 * 1024; // 4 KB, adjust as needed. Max WebSocket message size

        public AuthWebSocketManager(ILogger<AuthWebSocketManager> logger)
        {
            _logger = logger;
        }

        // IHostedService implementation
        public Task StartAsync(CancellationToken cancellationToken)
        {
            // No initialization required for this manager
            _logger.LogInformation("AuthWebSocketManager started.");
            return Task.CompletedTask;
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("StopAsync invoked for AuthWebSocketManager.");
            _logger.LogInformation($"Number of active WebSocket connections before closure: {_userSockets.Count}");

            var closeTasks = _userSockets.Values.Select(async conn =>
            {
                var socket = conn.Socket;
                try
                {
                    // Cancel any running ReceiveAsync loops
                    conn.Cts.Cancel();

                    if (socket.State == WebSocketState.Open || socket.State == WebSocketState.CloseReceived)
                    {
                        using var closeCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                        try
                        {
                            await socket.CloseAsync(
                                WebSocketCloseStatus.NormalClosure,
                                "Server shutting down",
                                closeCts.Token
                            );
                            _logger.LogInformation("WebSocket connection closed gracefully.");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning($"Closing socket for shutdown failed: {ex.Message}. Aborting.");
                            socket.Abort();
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Error closing WebSocket: {ex.Message}");
                }
            });

            await Task.WhenAll(closeTasks);

            // Remove them all from the dictionary
            var users = _userSockets.Keys.ToList();
            foreach (var userId in users)
            {
                if (_userSockets.TryRemove(userId, out _))
                {
                    _logger.LogInformation($"Removed WebSocket for user {userId} during StopAsync.");
                }
            }

            // Optional small delay
            await Task.Delay(1000, cancellationToken);

            _logger.LogInformation("All active WebSocket connections have been closed.");
            _logger.LogInformation($"Number of WebSocket connections after closure: {_userSockets.Count}");
        }

        // The main entrypoint for each WebSocket connection
        public async Task HandleConnectionAsync(WebSocket webSocket, HttpContext context)
        {
            string userId = null;
            SemaphoreSlim userLock = null;

            try
            {
                _logger.LogInformation("HandleConnectionAsync started.");
                // Log all claims for debugging
                var claims = context.User.Claims.Select(c => $"{c.Type}: {c.Value}").ToList();
                _logger.LogInformation("User claims: {Claims}", string.Join(", ", claims));

                // 1. Check if the user is authenticated
                if (!context.User.Identity.IsAuthenticated)
                {
                    _logger.LogWarning("Unauthenticated user. Closing immediately.");
                    await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Not authenticated", CancellationToken.None);
                    return;
                }

                userId = context.User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Missing 'sub' claim. Closing socket.");
                    await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "User ID not found", CancellationToken.None);
                    return;
                }

                _logger.LogInformation("Authenticated WebSocket connection established for user: {UserId}", userId);
                // 2. Acquire a lock for this user
                userLock = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
                await userLock.WaitAsync();

                // 3. If there's an existing connection, replace it
                try
                {
                    if (_userSockets.TryGetValue(userId, out var oldConn))
                    {
                        _logger.LogWarning($"Connection for {userId} already exists, replacing.");

                        // Remove old from dictionary so it won't remove the new one in its finally block
                        _userSockets.TryRemove(userId, out _);

                        // Cancel the old connection's read loop
                        oldConn.Cts.Cancel();

                        // Gracefully close old socket
                        if (oldConn.Socket.State == WebSocketState.Open)
                        {
                            try
                            {
                                await oldConn.Socket.CloseAsync(
                                    WebSocketCloseStatus.NormalClosure,
                                    "Replaced by new connection",
                                    CancellationToken.None
                                );
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning($"Old socket CloseAsync failed: {ex.Message}. Aborting old socket.");
                                oldConn.Socket.Abort();
                            }
                        }
                    }

                    // 4. Now add the new connection
                    var cts = new CancellationTokenSource();
                    var newConn = new WebSocketConnection(webSocket, cts);

                    if (!_userSockets.TryAdd(userId, newConn))
                    {
                        _logger.LogWarning($"Failed to add new WebSocket for user {userId}.");
                        await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Could not add connection", CancellationToken.None);
                        return;
                    }

                    _logger.LogInformation($"WebSocket connection established for user {userId}.");
                    // Send readiness acknowledgment
                    await SendMessageAsync(userId, "ready");
                }
                finally
                {
                    userLock.Release();
                }

                // 5. Start reading messages until canceled or socket closes
                await ReadLoopAsync(userId, webSocket);
            }
            catch (Exception ex)
            {
                _logger.LogError($"HandleConnectionAsync crashed for user {userId}: {ex.Message}");
            }
            finally
            {
                _logger.LogDebug($"Cleaning up WebSocket for user {userId}...");

                // 6. Cleanup only if we still own this connection
                if (!string.IsNullOrEmpty(userId))
                {
                    await userLock.WaitAsync();
                    try
                    {
                        if (_userSockets.TryGetValue(userId, out var currentConn) && currentConn.Socket == webSocket)
                        {
                            _userSockets.TryRemove(userId, out _);
                            _logger.LogInformation($"Removed WebSocket for user {userId} in final cleanup.");

                            // Try graceful close if it's still open
                            if (webSocket.State == WebSocketState.Open || webSocket.State == WebSocketState.CloseReceived)
                            {
                                try
                                {
                                    _logger.LogInformation($"Closing WebSocket for {userId} gracefully in final cleanup.");
                                    await webSocket.CloseAsync(
                                        WebSocketCloseStatus.NormalClosure,
                                        "Closing from final cleanup",
                                        CancellationToken.None
                                    );
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError($"Error during final CloseAsync: {ex.Message}");
                                }
                            }
                        }

                        // Remove the userLock if done
                        _userLocks.TryRemove(userId, out _);
                    }
                    finally
                    {
                        userLock.Release();
                    }
                }
                _logger.LogDebug($"Cleanup done for user {userId}.");
            }
        }

        //  Read loop that ends if the socket closes or if we canceled from replacement
        private async Task ReadLoopAsync(string userId, WebSocket socket)
        {
            // Access the CancellationTokenSource we stored
            if (!_userSockets.TryGetValue(userId, out var conn))
            {
                return; // If not found, the socket was replaced or removed
            }

            var cts = conn.Cts;
            var token = cts.Token;
            var buffer = new byte[1024];

            // We'll accumulate chunks in a MemoryStream for each full message
            using var ms = new MemoryStream();

            try
            {

                while (socket.State == WebSocketState.Open && !token.IsCancellationRequested)
                {
                    WebSocketReceiveResult result = null;
                    try
                    {
                        // Wait for data 
                        result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
                    }
                    catch (OperationCanceledException)
                    {
                        _logger.LogInformation($"Read canceled for user {userId} (replacement or shutdown).");
                        break;
                    }
                    catch (WebSocketException ex)
                    {
                        _logger.LogError($"WebSocketException for user {userId}: {ex.Message}");
                        break;
                    }

                    // Check if client closed
                    if (result.CloseStatus.HasValue)
                    {
                        _logger.LogInformation($"Socket for {userId} closed with status {result.CloseStatus}.");
                        break;
                    }


                    // If it's text, accumulate in memory
                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        // Add incoming chunk
                        ms.Write(buffer, 0, result.Count);

                        // Check if this chunk made the message exceed max size
                        if (ms.Length > MAX_MESSAGE_SIZE_BYTES)
                        {
                            _logger.LogWarning($"User {userId} sent too large message. Closing.");
                            await socket.CloseAsync(WebSocketCloseStatus.MessageTooBig,
                                "Message too big", token);
                            break;
                        }

                        // If this is the end of the message, process
                        if (result.EndOfMessage)
                        {
                            var message = Encoding.UTF8.GetString(ms.ToArray());
                            ms.SetLength(0); // reset stream for next message

                            _logger.LogInformation($"Received message from {userId}: {message}");

                            // Echo back
                            await SendMessageAsync(userId, $"Echo: {message}");
                        }
                    }
                    else
                    {
                        // We only support text messages
                        _logger.LogWarning($"User {userId} sent non-text message. Closing.");
                        await socket.CloseAsync(WebSocketCloseStatus.InvalidMessageType,
                            "Only text supported", token);
                        break;
                    }
                }
            }
            finally
            {
                _logger.LogDebug($"Read loop ended for user {userId}. Socket state: {socket.State}");
            }
        }

        // Send message to the currently stored socket (if open)
        public async Task SendMessageAsync(string userId, string message)
        {
            if (_userSockets.TryGetValue(userId, out var conn) &&
                conn.Socket.State == WebSocketState.Open)
            {
                var bytes = Encoding.UTF8.GetBytes(message);
                try
                {
                    _logger.LogInformation($"Sending to {userId}: {message}");
                    await conn.Socket.SendAsync(
                        new ArraySegment<byte>(bytes),
                        WebSocketMessageType.Text,
                        true,
                        CancellationToken.None
                    );
                }
                catch (WebSocketException ex)
                {
                    _logger.LogError($"Failed sending to user {userId}: {ex.Message}");
                }
            }
            else
            {
                _logger.LogWarning($"Cannot send to {userId} - socket not open or not found.");
            }
        }

        // Send a broadcast to all open connections
        public async Task BroadcastAsync(string message)
        {
            var bytes = Encoding.UTF8.GetBytes(message);
            var segment = new ArraySegment<byte>(bytes);

            var tasks = _userSockets.Values
                .Where(conn => conn.Socket.State == WebSocketState.Open)
                .Select(conn => conn.Socket.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None));

            await Task.WhenAll(tasks);
        }

    }
}
