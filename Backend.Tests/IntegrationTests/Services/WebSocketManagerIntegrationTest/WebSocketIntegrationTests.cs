using Backend.Application.DTO;
using Backend.Application.Interfaces.WebSockets;
using Backend.Infrastructure.WebSockets;
using Backend.Test.UserTests;
using Backend.Tests.Fixtures;
using Backend.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using System.Net.WebSockets;
using System.Text;
using Xunit;
using Xunit.Sdk;
using Backend.Application.DTO.User;
using Tests.Helpers;
using Backend.Infrastructure.Implementations;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System.Security.Cryptography;
using System;
using System.Threading;
using Backend.Settings;
using Microsoft.Extensions.Options;
namespace Backend.Tests.IntegrationTests.Services.WebSocketManagerIntegrationTest
{
    [CollectionDefinition("WebSocket Test Collection")]
    public class WebSocketCollection
      : ICollectionFixture<WebSocketFixture>, ICollectionFixture<DatabaseFixture>
    { }
    [Collection("WebSocket Test Collection")]
    public class WebSocketTests : IntegrationTestBase
    {
        private readonly WebSocketFixture _wsFixture;

        public WebSocketTests(DatabaseFixture dbFixture, WebSocketFixture wsFixture)
            : base(dbFixture)
        {
            _wsFixture = wsFixture;
        }

        [Fact]
        public async Task Authenticated_User_Should_Echo_Message()
        {
            // Arrange: mint a WS token + session
            var (token, pid, sid, mac) = await IssueWsTokenAsync();

            // Connect via helper (uses ?sid/&pid and jwt-<token> subprotocol)
            using var client = await ConnectAuthWebSocketAsync(token, pid, sid, mac);

            // Server must say "ready"
            (await ReceiveTextAsync(client, TimeSpan.FromSeconds(2)))
                .Should().Be("ready", "server always sends a ready message on successful handshake");

            // Send a message and expect it back
            var message = "Hello WebSocket";
            var bytes = Encoding.UTF8.GetBytes(message);
            await client.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                true,
                CancellationToken.None
            );

            var echo = await ReceiveTextAsync(client, TimeSpan.FromSeconds(2));
            echo.Should().Be($"Echo: {message}", "server should echo text prefixed with 'Echo:'");

            // Clean up
            await GracefulCloseIfOpen(client);
            client.State.Should().BeOneOf(WebSocketState.CloseReceived, WebSocketState.Closed);
        }




        [Fact]
        public async Task Unauthenticated_User_Should_FailToConnect_WithBadRequest() // Renamed for clarity
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            var wsUri = new Uri($"{_wsFixture.ServerAddress.Replace("http", "ws")}/ws/auth"); // No auth params
            using var clientWebSocket = new ClientWebSocket();

            // We do not add the subprotocol here, as this is an unauthenticated request
            // clientWebSocket.Options.AddSubProtocol("hmac-v1");

            Console.WriteLine($"Attempting unauthenticated connection to WebSocket at: {wsUri}");

            // ── Act & Assert ────────────────────────────────────────────────────
            // The ConnectAsync call to be tested is solely within this Func
            Func<Task> connectAction = async () => await clientWebSocket.ConnectAsync(wsUri, CancellationToken.None);

            var exception = await connectAction.Should().ThrowAsync<WebSocketException>(
                "because the server should reject the handshake with an HTTP 400 Bad Request " +
                "when required authentication parameters (pid, sid, mac) are missing.");

            // Assert the content of the exception message
            exception.And.Message.Should().Contain("status code '400'", "the server should return a 400 Bad Request");
            exception.And.Message.Should().Contain("status code '101' was expected", "this is the standard WebSocketException message format for handshake failures");

            // After ConnectAsync fails, the client's state should be Closed (or Aborted).
            clientWebSocket.State.Should().Be(WebSocketState.Closed, "client should be in a closed state after a failed connection attempt");

            Console.WriteLine("Unauthenticated WebSocket connection attempt was correctly refused with HTTP 400.");
        }

        [Fact]
        public async Task Broadcast_Message_Should_Be_Received_By_All_Connected_Clients()
        {
            // ── ARRANGE: mint two independent WS tokens + sessions ────────────────
            var (token1, pid1, sid1, mac1) = await IssueWsTokenAsync();
            var (token2, pid2, sid2, mac2) = await IssueWsTokenAsync();

            // ── ACT: connect both clients via the auth helper ────────────────────
            using var client1 = await ConnectAuthWebSocketAsync(token1, pid1, sid1, mac1);
            using var client2 = await ConnectAuthWebSocketAsync(token2, pid2, sid2, mac2);


            client1.State.Should().Be(WebSocketState.Open);
            client2.State.Should().Be(WebSocketState.Open);

            // Both should receive "ready"
            var ready1 = await ReceiveTextAsync(client1, TimeSpan.FromSeconds(2));
            var ready2 = await ReceiveTextAsync(client2, TimeSpan.FromSeconds(2));
            ready1.Should().Be("ready");
            ready2.Should().Be("ready");

            // ── BROADCAST ─────────────────────────────────────────────────────────
            var broadcastMessage = "This is a broadcast message.";
            var mgr = _wsFixture.Host.Services.GetRequiredService<IWebSocketManager>();
            await mgr.BroadcastAsync(broadcastMessage);

            // ── EACH CLIENT MUST RECEIVE IT ───────────────────────────────────────
            var recv1 = await ReceiveTextAsync(client1, TimeSpan.FromSeconds(2));
            var recv2 = await ReceiveTextAsync(client2, TimeSpan.FromSeconds(2));
            recv1.Should().Be(broadcastMessage);
            recv2.Should().Be(broadcastMessage);

            // ── CLEANUP ───────────────────────────────────────────────────────────
            await GracefulCloseIfOpen(client1);
            await GracefulCloseIfOpen(client2);

            client1.State.Should().BeOneOf(WebSocketState.Closed, WebSocketState.Aborted);
            client2.State.Should().BeOneOf(WebSocketState.Closed, WebSocketState.Aborted);
        }



        [Fact]
        public async Task Send_Message_To_Specific_User_Should_Be_Received_By_Target_Client_Only()
        {
            // ── Arrange: mint two valid tokens + pid/sid pairs ────────────────────────
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");

            var (token1, pid1, sid1, mac1) = await IssueWsTokenAsync();
            var (token2, pid2, sid2, mac2) = await IssueWsTokenAsync();

            var uri1 = new Uri($"{baseWs}/ws/auth?sid={sid1}&pid={pid1}&mac={mac1}");
            var uri2 = new Uri($"{baseWs}/ws/auth?sid={sid2}&pid={pid2}&mac={mac2}");

            using var client1 = new ClientWebSocket();
            using var client2 = new ClientWebSocket();

            // tell the options to send the JWT in the sub-protocol header
            client1.Options.AddSubProtocol("hmac-v1");
            client2.Options.AddSubProtocol("hmac-v1");

            // Connect both in parallel
            await Task.WhenAll(
                client1.ConnectAsync(uri1, CancellationToken.None),
                client2.ConnectAsync(uri2, CancellationToken.None)
            );

            client1.State.Should().Be(WebSocketState.Open);
            client2.State.Should().Be(WebSocketState.Open);

            // Consume initial "ready" frames
            (await ReceiveTextAsync(client1, TimeSpan.FromSeconds(2))).Should().Be("ready");
            (await ReceiveTextAsync(client2, TimeSpan.FromSeconds(2))).Should().Be("ready");

            // ── Act: send only to client2 ─────────────────────────────────────────────
            var message = "Hello Client2!";
            var mgr = _wsFixture.Host.Services.GetRequiredService<IWebSocketManager>();
            await mgr.SendMessageAsync(new UserSessionKey(pid2, sid2), message);

            // ── Assert: client1 gets *nothing* (timeout) ──────────────────────────────
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(1));
            var buffer = new byte[128];
            await Assert.ThrowsAsync<TaskCanceledException>(async () =>
                await client1.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token)
            );

            // ── Assert: client2 receives exactly our text ─────────────────────────────
            (await ReceiveTextAsync(client2, TimeSpan.FromSeconds(2))).Should().Be(message);

            // ── Cleanup ───────────────────────────────────────────────────────────────
            await GracefulCloseIfOpen(client1);
            await GracefulCloseIfOpen(client2);
        }


        [Fact]
        public async Task Server_Should_Handle_Multiple_Concurrent_Connections()
        {
            const int clientCount = 10;
            var clients = new List<(ClientWebSocket Ws, Guid Pid, Guid Sid, string PlainMsg, string Mac)>();

            for (int i = 0; i < clientCount; i++)
            {
                var (token, pid, sid, mac) = await IssueWsTokenAsync();

                var ws = new ClientWebSocket();
                ws.Options.AddSubProtocol("hmac-v1");

                var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
                var uri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={mac}");
                await ws.ConnectAsync(uri, CancellationToken.None);

                clients.Add((ws, pid, sid, $"Message from client {i + 1}", mac));
            }

            // ── Assert: everyone is OPEN ───────────────────────────────────────────  
            foreach (var (ws, _, _, _, _) in clients)
                ws.State.Should().Be(WebSocketState.Open, "all clients should be connected");

            // ── Consume the initial "ready" handshake on each ─────────────────────  
            foreach (var (ws, _, _, _, _) in clients)
            {
                var ready = await ReceiveTextAsync(ws, TimeSpan.FromSeconds(2));
                ready.Should().Be("ready", "server must ACK each connection with 'ready'");
            }

            // ── Send a distinct message from each client ─────────────────────────  
            var sendTasks = clients.Select(c =>
            {
                var bytes = Encoding.UTF8.GetBytes(c.PlainMsg);
                return c.Ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
            });
            await Task.WhenAll(sendTasks);

            // ── Receive and verify each echo (same order) ───────────────────────  
            var echoes = await Task.WhenAll(clients.Select(async c =>
            await ReceiveTextAsync(c.Ws, TimeSpan.FromSeconds(2))));

            // simple index-based assert to preserve order
            for (int i = 0; i < clientCount; i++)
            {
                var expected = $"Echo: {clients[i].PlainMsg}";
                echoes[i].Should().Be(expected, $"client #{i + 1} must get its own echo");
            }

            // ── Cleanup: close all sockets gracefully ───────────────────────────  
            var closeTasks = clients.Select(c =>
                c.Ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None)
            );
            await Task.WhenAll(closeTasks);

            // give them a moment to finish the handshake
            await Task.Delay(100);

            clients.All(c => c.Ws.State is WebSocketState.CloseReceived or WebSocketState.Closed)
                   .Should().BeTrue("all clients should close gracefully");
        }





        [Fact]
        public async Task Server_Should_Remove_WebSocket_On_Client_Disconnect()
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            var (token, pid, sid, mac) = await IssueWsTokenAsync();
            var manager = (WebSocketManager)_wsFixture.Host.Services
                               .GetRequiredService<IWebSocketManager>();

            // Connect using the helper
            using var client = await ConnectAuthWebSocketAsync(token, pid, sid, mac);

            // Consume the "ready" frame so manager registers us
            var ready = await ReceiveTextAsync(client, TimeSpan.FromSeconds(5));
            ready.Should().Be("ready");
            manager.ActiveConnectionCount.Should().Be(1);

            // ── Act ─────────────────────────────────────────────────────────────
            await client.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", CancellationToken.None);
            await Task.Delay(200); // let cleanup run

            // ── Assert ──────────────────────────────────────────────────────────
            manager.ActiveConnectionCount
                   .Should().Be(0, "after the client closes, the WebSocketManager should remove it");
        }

        [Fact]
        public async Task Server_Should_Handle_Malformed_Messages_Gracefully()
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            // Mint a real JWT + session
            var (token, pid, sid, mac) = await IssueWsTokenAsync();

            // Build our WS URL (only sid & pid in the query)
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var wsUri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={mac}");

            // Connect a ClientWebSocket, passing the JWT as the subprotocol
            using var client = new ClientWebSocket();
            client.Options.AddSubProtocol("hmac-v1");
            await client.ConnectAsync(wsUri, CancellationToken.None);

            // Consume the initial "ready" so the manager registers us
            var ready = await ReceiveTextAsync(client, TimeSpan.FromSeconds(5));
            ready.Should().Be("ready");

            // ── Act: send a binary frame (malformed) ───────────────────────────
            var malformed = new byte[] { 0xFF, 0xFE, 0xFD };
            await client.SendAsync(
                new ArraySegment<byte>(malformed),
                WebSocketMessageType.Binary,
                endOfMessage: true,
                cancellationToken: CancellationToken.None
            );

            // ── Assert: server should respond with a Close frame (InvalidMessageType)
            var buffer = new byte[1024];
            var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

            result.MessageType.Should().Be(WebSocketMessageType.Close);
            result.CloseStatus.Should().Be(WebSocketCloseStatus.InvalidMessageType);

            // And the client socket should now be closing/closed
            client.State.Should().BeOneOf(
                WebSocketState.CloseReceived,
                WebSocketState.Closed
            );
        }


        [Fact]
        public async Task Server_Should_Reject_Too_Large_Messages_With_ForcedAbort()
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            var (token, pid, sid, mac) = await IssueWsTokenAsync();

            // Connect using the new helper (jwt subprotocol, ?sid/&pid)
            using var client = await ConnectAuthWebSocketAsync(token, pid, sid, mac);

            // ── Consume the initial "ready" so the manager registers us ───────────
            var ready = await ReceiveTextAsync(client, TimeSpan.FromSeconds(3));
            ready.Should().Be("ready");

            // ── Act: send a 5 KB payload (limit is 4 KB) ───────────────────────────
            var huge = new string('A', 5 * 1024);
            var bytes = Encoding.UTF8.GetBytes(huge);
            await client.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);

            // ── Assert: connection must close or abort ───────────────────────────
            var closed = await WasClosedOrAbortedAsync(client, TimeSpan.FromSeconds(3));
            closed.Should().BeTrue("server should terminate oversized messages");
        }

        [Fact]
        public async Task Should_Not_Hang_AfterSuccessfulConnection() // Renamed for clarity
        {
            // ── Arrange: Establish a valid, authenticated WebSocket connection ────────
            var (jwtToken, pid, sid, mac) = await IssueWsTokenAsync(); // Use your helper to get valid params
            var wsUri = new Uri($"{_wsFixture.ServerAddress.Replace("http", "ws")}/ws/auth?pid={pid}&sid={sid}&mac={mac}");

            using var client = new ClientWebSocket();
            client.Options.AddSubProtocol("hmac-v1"); // Crucial for your hmac-v1 setup

            // This ConnectAsync should now succeed (HTTP 101)
            await client.ConnectAsync(wsUri, CancellationToken.None);
            client.State.Should().Be(WebSocketState.Open, "the client should be open after a successful connection.");

            // ── Act & Assert: Attempt to receive the initial message with a timeout ────
            // Timeout for receiving the initial message (e.g., "ready")
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var buffer = new ArraySegment<byte>(new byte[1024]); // Use ArraySegment correctly
            WebSocketReceiveResult receiveResult;

            try
            {
                receiveResult = await client.ReceiveAsync(buffer, cts.Token);
            }
            catch (OperationCanceledException)
            {
                // This means ReceiveAsync timed out, i.e., the server "hung" or didn't send the expected initial message.
                throw new Xunit.Sdk.XunitException("Test failed: Timed out waiting for an initial message from the server after successful connection. The server might be hanging.");
            }

            // If we reach here, ReceiveAsync completed without timing out.
            // Check if the server sent the expected "ready" message.
            receiveResult.MessageType.Should().Be(WebSocketMessageType.Text, "the server should send a text message (e.g., 'ready').");

            // Decode the message
            var receivedMessage = System.Text.Encoding.UTF8.GetString(buffer.Array, buffer.Offset, receiveResult.Count);
            receivedMessage.Should().Be("ready", "the server should send 'ready' as the initial message.");

            // ── Cleanup: Gracefully close the WebSocket connection ───────────────────
            // If the connection is still open after receiving "ready"
            if (client.State == WebSocketState.Open)
            {
                await client.CloseAsync(WebSocketCloseStatus.NormalClosure, "Test completed", CancellationToken.None);
            }
        }




        [Fact]
        public async Task Server_Should_Shutdown_Gracefully_With_Active_Connections()
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            var (token, pid, sid, mac) = await IssueWsTokenAsync();

            // Connect using the new helper
            using var client = await ConnectAuthWebSocketAsync(token, pid, sid, mac);

            // ── Consume the initial "ready" frame so the manager registers us ─────
            var ready = await ReceiveTextAsync(client, TimeSpan.FromSeconds(5));
            ready.Should().Be("ready");

            // Prepare to capture the server's close-frame (or abort)
            var buffer = new byte[256];
            var receiveClose = client.ReceiveAsync(buffer, CancellationToken.None);

            // ── Act ─────────────────────────────────────────────────────────────
            // Stop the host, but ignore its cancellation so our test can continue
            var stopHost = _wsFixture.Host.StopAsync()
                .ContinueWith(t => { /* swallow TaskCanceledException */ },
                              TaskContinuationOptions.OnlyOnCanceled);

            await stopHost;  // ensure host shutdown initiated

            // ── Assert ──────────────────────────────────────────────────────────
            try
            {
                // If the server does a clean close handshake, we'll get a Close frame here
                var result = await receiveClose;
                result.MessageType.Should().Be(WebSocketMessageType.Close);
                result.CloseStatus.Should().Be(WebSocketCloseStatus.NormalClosure);
            }
            catch (WebSocketException)
            {
                // Kestrel may abort the socket mid-shutdown.
                // That's fine as long as the client ends up Closed or Aborted.
            }

            client.State
                  .Should()
                  .BeOneOf(
                     new[]
                     {
                       WebSocketState.CloseReceived,
                       WebSocketState.Closed,
                       WebSocketState.Aborted
                     },
                "the client should observe the server-initiated shutdown (clean or abort)"
            );
        }



        [Fact]
        public async Task Server_Should_Replace_Existing_Connection_For_Same_User()
        {
            /* ---------- arrange: build a conforming WS URL (new style) ------- */
            var(token, pid, sid, mac) = await IssueWsTokenAsync();
            
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var wsUri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={mac}");
            using var first = new ClientWebSocket();
            using var second = new ClientWebSocket();
            
            // tell the server our JWT via the sub-protocol header
            first.Options.AddSubProtocol("hmac-v1");
            second.Options.AddSubProtocol("hmac-v1");

            /* ---------- first connection -------------------------------------- */
            await first.ConnectAsync(wsUri, CancellationToken.None);
            await ExpectTextAsync(first, "ready");          // ACK from server

            /* ---------- second connection with IDENTICAL pid+sid -------------- */
            await second.ConnectAsync(wsUri, CancellationToken.None);
            await ExpectTextAsync(second, "ready");          // replacement ACK

            /* ---------- server must have closed the first socket -------------- */
            await AssertFirstSocketClosedAsync(first);


            /* ---------- second socket must stay open and echo ----------------- */
            const string payload = "ping-pong";
            await second.SendAsync(
            new ArraySegment<byte>(Encoding.UTF8.GetBytes(payload)),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken: CancellationToken.None
                        );

            (await ExpectTextAsync(second, $"Echo: {payload}"))
                .Should().Be($"Echo: {payload}");
        }



        // Helper method for retries
        private async Task<string> RetryReceiveMessage(ClientWebSocket clientSocket, int maxAttempts, TimeSpan delay)
        {
            var buffer = new byte[1024];

            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                try
                {
                    var result = await clientSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        Console.WriteLine($"Received message: {message}");
                        return message;
                    }
                }
                catch (WebSocketException ex)
                {
                    // Log and retry
                    Console.WriteLine($"Retry {attempt}/{maxAttempts} failed: {ex.Message}");
                }

                await Task.Delay(delay);
            }

            throw new TimeoutException("Failed to receive message within the allotted retries.");
        }
        // Helper that closes the socket if it is still open or close-received
        private static async Task GracefulCloseIfOpen(ClientWebSocket socket)
        {
            if (socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                try
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                }
                catch (WebSocketException)
                {
                    // Already aborted or forcibly closed, ignore
                }
            }
        }
        // Helper: read the initial "ready"
        private async Task ReadReadyMessage(ClientWebSocket client, string clientName)
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            var buffer = new byte[1024];
            var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
            var msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
            msg.Should().Be("ready", $"{clientName} should receive 'ready' on connect");
        }
        // Helper: wait for an expected message with a short timeout
        private async Task ReceiveExpectedMessage(ClientWebSocket client, string expectedMessage, string clientName)
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var buffer = new byte[1024];
            var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
            var msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
            msg.Should().Be(expectedMessage, $"{clientName} should receive the broadcast message");
        }

        // Graceful close if open
        private async Task CloseIfOpen(ClientWebSocket socket)
        {
            if (socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                try
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                }
                catch (WebSocketException)
                {
                    // Already aborted or forcibly closed
                }
            }
        }
        private static async Task ExpectMessage(
        ClientWebSocket client,
        string expectedMessage,
        string clientName,
        TimeSpan? timeout = null)
            {
            // Because reason X: we want a short read timeout, e.g. 3 seconds by default
            using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(3));

            var buffer = new byte[1024];
            try
            {
                var result = await client.ReceiveAsync(buffer, cts.Token);

                var actualMessage = Encoding.UTF8.GetString(buffer, 0, result.Count);

                actualMessage.Should().Be(expectedMessage,
                    because: $"client {clientName} should receive the broadcast message");
            }
            catch (OperationCanceledException)
            {
                throw new Xunit.Sdk.XunitException(
                    $"Timed out waiting for message '{expectedMessage}' on client {clientName}.");
            }
        }
        [Fact]
        public async Task HealthCheck_Should_Send_Ping_And_Client_Responds_With_Pong()
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            // Mint a real session
            var (token, pid, sid, mac) = await IssueWsTokenAsync();

            // Build our WS URL (only sid & pid in the query)
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var wsUri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={mac}");

            // Connect a ClientWebSocket, passing the JWT as the subprotocol
            using var client = new ClientWebSocket();
            client.Options.AddSubProtocol("hmac-v1");
            await client.ConnectAsync(wsUri, CancellationToken.None);



            // helper that reads a single text frame within a timeout
            async Task<string> ReceiveText(TimeSpan timeout)
            {
                var buffer = new byte[1024];
                using var cts = new CancellationTokenSource(timeout);
                var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
                return Encoding.UTF8.GetString(buffer, 0, result.Count);
            }

            // Consume the initial "ready" so the manager registers us
            var ready = await ReceiveTextAsync(client, TimeSpan.FromSeconds(5));
            ready.Should().Be("ready");

            // ── Act: trigger health check ────────────────────────────────────────
            var wsManager = _wsFixture.Host.Services.GetRequiredService<IWebSocketManager>();
            await wsManager.HealthCheckAsync();

            // ── Assert: client gets “ping” ───────────────────────────────────────
            var ping = await ReceiveText(TimeSpan.FromSeconds(5));
            ping.Should().Be("ping", "health check should send a ping");

            // ── Act: reply with “pong” ───────────────────────────────────────────
            var pongBytes = Encoding.UTF8.GetBytes("pong");
            await client.SendAsync(new ArraySegment<byte>(pongBytes), WebSocketMessageType.Text, true, CancellationToken.None);

            // give the server a moment to process
            await Task.Delay(200);

            // ── Act: trigger a second health check ───────────────────────────────
            await wsManager.HealthCheckAsync();

            // ── Assert: still open and we get a second ping ─────────────────────
            var secondPing = await ReceiveText(TimeSpan.FromSeconds(5));
            secondPing.Should().Be("ping", "connection should remain healthy and receive another ping");
        }
        [Fact]
        public async Task HealthCheck_Should_CloseConnection_WhenNoPongReply_ForcedAbortExpected()
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            var (token, pid, sid, mac) = await IssueWsTokenAsync();

            // Connect using the new helper
            using var client = await ConnectAuthWebSocketAsync(token, pid, sid, mac);

            // ── Consume the initial "ready" frame so the manager registers us ─────
            var ready = await ReceiveTextAsync(client, TimeSpan.FromSeconds(5));
            ready.Should().Be("ready");

            // ── ACT #1: fire the first health check → should see “ping” ─────────
            var mgr = _wsFixture.Host.Services.GetRequiredService<IWebSocketManager>();
            await mgr.HealthCheckAsync();

            var ping1 = await ReceiveTextAsync(client, TimeSpan.FromSeconds(5));
            ping1.Should().Be("ping");

            // (do NOT reply “pong”)

            // wait past the pong timeout + small buffer
            await Task.Delay(TimeSpan.FromSeconds(12));

            // ── ACT #2: fire again → manager should abort the socket ─────────────
            await mgr.HealthCheckAsync();

            // ── ASSERT: no clean close handshake; ReceiveAsync must throw ────────
            var buf = new byte[1_024];
            await FluentActions.Awaiting(async () =>
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                await client.ReceiveAsync(buf, cts.Token);
            })
            .Should()
            .ThrowAsync<WebSocketException>()
            .WithMessage("*closed the WebSocket connection without completing the close handshake*");
        }


        [Fact]
        public async Task ExpiredRefreshToken_Should_Trigger_SessionExpired_Notification()
        {
            // ── ARRANGE ────────────────────────────────────────────────────────
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // 1) Normal login – writes the refresh-token row we’ll later expire
            var login = (await AuthService.LoginAsync(
                new UserLoginDto
                {
                    Email = registeredUser.Email,
                    Password = "Password123!",
                    CaptchaToken = "valid-captcha-token",
                    RememberMe = true,
                },
                ip: "127.0.0.1",
                deviceId: "test-device",
                ua: "test-agent"
            )).ShouldBeSuccess();

            // 2) Mint a second, WS-only token bound to THAT SAME session
            var jwtSvc = _wsFixture.Host.Services.GetRequiredService<JwtService>();
            var wsResult = await jwtSvc.CreateAccessTokenAsync(
                               persoid: registeredUser.PersoId,
                               email: registeredUser.Email,
                               roles: Array.Empty<string>(),
                               deviceId: "tests",
                               userAgent: "integration-test",
                               sessionId: login.Access.SessionId);    // <-- reuse session

            var wsToken = wsResult.Token;      // short enough for Sec-WebSocket-Protocol
            var sid = login.Access.SessionId;  // keep the same sessionId
            var wsCfg = _wsFixture.Host.Services.GetRequiredService<IOptions<WebSocketSettings>>().Value;
            var mac = WebSocketAuth.MakeWsMac(registeredUser.PersoId, sid, wsCfg.Secret);

            // 3) Connect over WS (jwt-<token> sub-protocol)
            using var client = await ConnectAuthWebSocketAsync(
                wsToken,
                registeredUser.PersoId,
                sid, mac);

            // Server should greet with "ready"
            (await ReceiveTextAsync(client, TimeSpan.FromSeconds(5)))
                .Should().Be("ready");

            // ── EXPIRE the refresh token we logged in with ──────────────────────
            var (conn, tx) = await CreateTransactionAsync();
            try
            {
                var ok = await UserSQLProvider.RefreshTokenSqlExecutor
                    .UpdateAbsoluteExpiryAsync(
                        registeredUser.PersoId,
                        login.Access.SessionId,          // ← expire that row
                        conn, tx,
                        whenUtc: null);                  // NULL = already expired
                await tx.CommitAsync();
                ok.Should().BeTrue();
            }
            finally
            {
                await tx.DisposeAsync();
                await conn.DisposeAsync();
            }

            // ── FORCE logout via the WS manager ─────────────────────────────────
            var mgr = (WebSocketManager)_wsFixture.Host.Services
                         .GetRequiredService<IWebSocketManager>();

            await mgr.ForceLogoutAsync(
                registeredUser.PersoId.ToString(),
                reason: "session-expired");

            // ── ASSERT: client receives "session-expired" or is closed ──────────
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                var buf = new byte[1024];
                var res = await client.ReceiveAsync(
                              new ArraySegment<byte>(buf),   // <-- fixes CS1503
                              cts.Token);

                res.MessageType.Should().Be(WebSocketMessageType.Text);
                Encoding.UTF8.GetString(buf, 0, res.Count)
                    .Should().Be("session-expired");
            }
            catch (WebSocketException)
            {
                client.State.Should().BeOneOf(
                    WebSocketState.Closed,
                    WebSocketState.Aborted);
            }
            finally
            {
                await GracefulCloseIfOpen(client);
            }
        }

        [Fact]
        public async Task Connection_Should_Be_Rejected_Without_Required_Query_Parameters() 
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            // URI without any authentication query parameters (pid, sid, mac)
            var wsUri = new Uri($"{_wsFixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();

            // No subprotocol is added here, as the primary failure should be missing query parameters
            // which typically results in an HTTP 400 before subprotocol negotiation is decisive.

            // ── Act & Assert ────────────────────────────────────────────────────
            // The ConnectAsync call itself is expected to fail because required query parameters are missing.
            Func<Task> connectAction = async () => await client.ConnectAsync(wsUri, CancellationToken.None);

            var exception = await connectAction.Should().ThrowAsync<WebSocketException>(
                "because the server should reject the handshake with an HTTP 400 Bad Request " +
                "when required authentication query parameters (pid, sid, mac) are missing from the URL.");

            // Assert the content of the exception message to confirm it's due to an HTTP 400
            exception.And.Message.Should().Contain("status code '400'",
                "the server should return a 400 Bad Request due to missing authentication query parameters.");
            exception.And.Message.Should().Contain("status code '101' was expected.", "because...",
             "this is part of the standard WebSocketException message when the handshake fails at the HTTP level.");

            // After ConnectAsync fails, the client's state should be Closed.
            client.State.Should().Be(WebSocketState.Closed,
                "the client WebSocket should be in a Closed state after the failed connection attempt.");
        }

        [Fact]
        public async Task Connection_Should_Be_Rejected_With_Invalid_Or_Missing_Core_Query_Parameters() 
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            // Build a WS URL with unparseable 'pid' and 'sid', and a missing 'mac'.
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var wsUri = new Uri($"{baseWs}/ws/auth?token=foo&pid=not-a-guid&sid=also-nope"); // mac is missing

            using var client = new ClientWebSocket();
            // No client subprotocol needs to be offered; the failure is due to bad query parameters,
            // which are checked by the server before subprotocol negotiation in your fixture.

            // ── Act & Assert ────────────────────────────────────────────────────
            // The ConnectAsync call itself is expected to fail due to invalid/missing parameters.
            Func<Task> connectAction = async () => await client.ConnectAsync(wsUri, CancellationToken.None);

            var exception = await connectAction.Should().ThrowAsync<WebSocketException>(
                "because the server should reject the handshake with an HTTP 400 Bad Request " +
                "when essential query parameters like 'pid' or 'sid' are unparseable, or 'mac' is missing.");

            // Assert the content of the exception message to confirm it's an HTTP 400
            exception.And.Message.Should().Contain("status code '400'",
                "the server should return a 400 Bad Request.");
            // Remember to use the corrected string for this assertion (no extra trailing quote)
            exception.And.Message.Should().Contain("status code '101' was expected",
                "this is part of the standard WebSocketException message when the handshake fails at the HTTP level.");

            // After ConnectAsync fails, the client's WebSocket state should be Closed.
            client.State.Should().Be(WebSocketState.Closed,
                "the client WebSocket should be in a Closed state after the failed connection attempt.");
        }

        [Fact]
        public async Task Server_Should_Handle_Rapid_Connect_Disconnect_Sequences()
        {
            // ── Arrange: mint one WS token/session and build the URL ─────────────
            var (token, pid, sid, mac) = await IssueWsTokenAsync();
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var wsUri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={mac}");

            const int iterations = 20;

            for (int i = 0; i < iterations; i++)
            {
                using var client = new ClientWebSocket();
                // advertise our JWT subprotocol each time
                client.Options.AddSubProtocol("hmac-v1");

                // ── Act: open the socket ───────────────────────────────────────────
                await client.ConnectAsync(wsUri, CancellationToken.None);
                client.State.Should().Be(
                    WebSocketState.Open,
                    $"Iteration {i}: expected an OPEN socket"
                );

                // ── (Optional) consume the initial "ready" handshake message ───────
                {
                    var buf = new byte[64];
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                    var res = await client.ReceiveAsync(
                        new ArraySegment<byte>(buf),
                        cts.Token
                    );
                    res.MessageType.Should().Be(WebSocketMessageType.Text);
                    var msg = Encoding.UTF8.GetString(buf, 0, res.Count);
                    msg.Should().Be("ready", $"Iteration {i}: initial handshake");
                }

                // ── Now immediately close cleanly ─────────────────────────────────
                await client.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Rapid disconnect",
                    CancellationToken.None
                );

                // some implementations flip through CloseSent→CloseReceived→Closed
                client.State
                    .Should()
                    .BeOneOf(
                        new[] {
                        WebSocketState.CloseSent,
                        WebSocketState.CloseReceived,
                        WebSocketState.Closed
                        },
                        $"Iteration {i}: expected a terminal close state"
                    );
            }
        }
        [Fact]
        public async Task Server_Should_Close_Connection_On_Unexpected_Message_Type()
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            // Mint a real JWT + session
            var (token, pid, sid, mac) = await IssueWsTokenAsync();

            // Build our WS URL 
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var wsUri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={mac}");

            // Connect a ClientWebSocket, passing the JWT as the subprotocol
            using var client = new ClientWebSocket();
            client.Options.AddSubProtocol("hmac-v1");
            await client.ConnectAsync(wsUri, CancellationToken.None);

            // Consume the initial "ready" so the manager registers us
            var ready = await ReceiveTextAsync(client, TimeSpan.FromSeconds(5));
            ready.Should().Be("ready");

            // ── Act: send a binary frame (server only supports text) ────────────────
            var bad = new byte[] { 0x01, 0x02, 0x03 };
            await client.SendAsync(
                new ArraySegment<byte>(bad),
                WebSocketMessageType.Binary,
                true,
                CancellationToken.None
            );

            // ── Assert: server must close with InvalidMessageType ────────────────────
            var buffer = new byte[1024];
            var close = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            close.MessageType.Should().Be(WebSocketMessageType.Close);
            close.CloseStatus.Should().Be(WebSocketCloseStatus.InvalidMessageType);

            client.State.Should().BeOneOf(
                WebSocketState.CloseReceived,
                WebSocketState.Closed
            );
        }

        [Fact]
        public async Task WebSocket_Handshake_WithMismatchedPid_ShouldCloseConnection()
        {
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto { Email = "test@example.com", Password = "Password123!", CaptchaToken = "mock" };

            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

            var login = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();

            // build WS url with wrong persoid (new style: token in subprotocol, sid/pid in query)
            var wrongPid = Guid.NewGuid();                     // ≠ token sub
                                                               // the fixture registered WebSocketSettings with the same secret
            var sid = login.Access.SessionId;  // keep the same sessionId
            var wsCfg = _wsFixture.Host.Services.GetRequiredService<IOptions<WebSocketSettings>>().Value;
            var mac = WebSocketAuth.MakeWsMac(user.PersoId, sid, wsCfg.Secret);

            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var url = $"{baseWs}/ws/auth" +
                      $"?sid={sid}" +             // Use the sid variable
                      $"&pid={wrongPid}" +       // The pid you intend to be "wrong" for the MAC
                      $"&mac={mac}";             // Use '&' and the calculated mac variable

            using var client = new ClientWebSocket();

            client.Options.AddSubProtocol("hmac-v1");

            // Expect HTTP 401 during handshake:
            Func<Task> connectAction = async () => await client.ConnectAsync(new Uri(url), CancellationToken.None);

            var exception = await connectAction.Should().ThrowAsync<WebSocketException>("because the MAC validation should fail with a mismatched PID before connection establishment");

            exception.And.Message.Should().Contain("401"); // Or "status code '401'"

            // If ConnectAsync fails, the state won't be Open, CloseReceived, or CloseSent.
            client.State.Should().Be(WebSocketState.Closed, "client should be in a closed state after a failed connection attempt");
        }

        [Fact]
        public async Task Server_Should_Reject_Connection_With_Tampered_Mac() 
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            // IssueWsTokenAsync provides the original pid, sid, and a validMac.
            // The 'token' (JWT string) itself isn't directly used in the hmac-v1 connection URI.
            var (_, pid, sid, validMac) = await IssueWsTokenAsync();

            // Create a tampered version of the MAC
            var tamperedMac = validMac.Substring(0, validMac.Length - 1) + (validMac.EndsWith("a") ? "b" : "a");

            // Construct the WebSocket URI with the TAMPERED MAC
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var wsUri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={tamperedMac}");

            using var client = new ClientWebSocket();
            // The client still offers the "hmac-v1" subprotocol, as that's what it intends to use.
            client.Options.AddSubProtocol("hmac-v1");

            // ── Act & Assert ────────────────────────────────────────────────────
            // The action of connecting with the tampered MAC should throw a WebSocketException.
            Func<Task> connectAction = async () => await client.ConnectAsync(wsUri, CancellationToken.None);

            var exception = await connectAction.Should().ThrowAsync<WebSocketException>(
                "because the server should reject the handshake with an HTTP 401 Unauthorized " +
                "when the provided MAC is tampered or invalid.");

            // Verify the exception message indicates an HTTP 401 error
            exception.And.Message.Should().Contain("status code '401'", "the server should return a 401 Unauthorized for an invalid MAC");
            exception.And.Message.Should().Contain("status code '101' was expected", "this is the standard WebSocketException message format for handshake failures");

            // After a failed connection attempt, the client's state should be Closed.
            client.State.Should().Be(WebSocketState.Closed, "client state should be Closed after a failed connection attempt");

            // The SubProtocol property would not be set if the handshake fails.
            client.SubProtocol.Should().BeNull("subprotocol should not be established if the handshake fails.");
        }

        [Fact]
        public async Task Server_Should_Reject_Connection_Attempt_Without_HmacV1_Subprotocol() 
        {
            // ── Arrange ─────────────────────────────────────────────────────────
            // Mint a real WS JWT + session identifiers, mac for a valid auth attempt (if subprotocol were present)
            var (token, pid, sid, mac) = await IssueWsTokenAsync();

            // Build the ws:// URL with sid, pid, and mac. These are valid.
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var uri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={mac}");

            using var client = new ClientWebSocket();
            // INTENTIONALLY DO NOT ADD A SUBPROTOCOL: client.Options.AddSubProtocol("hmac-v1");

            // ── Act & Assert: Connect attempt should fail at the HTTP handshake level ─────
            Func<Task> connectAction = async () => await client.ConnectAsync(uri, CancellationToken.None);

            var exception = await connectAction.Should().ThrowAsync<WebSocketException>(
                "because the server is configured to accept only the 'hmac-v1' subprotocol, " +
                "and the client did not offer it, leading to a handshake failure.");

            // Verify the exception message indicates an HTTP 400 error (common for such handshake failures)
            exception.And.Message.Should().Contain("requested '' protocol",
                   "the exception message should indicate that the client requested no specific protocol (or an empty set).");
            exception.And.Message.Should().Contain("server is only accepting 'hmac-v1' protocol(s)",
                "the exception message should state that the server specifically requires 'hmac-v1'.");

            // After a failed connection attempt, the client's state should be Closed.
            client.State.Should().Be(WebSocketState.Closed, "client state should be Closed after a failed connection attempt");

            // SubProtocol should be null as negotiation failed
            client.SubProtocol.Should().BeNull("no subprotocol should have been established.");
        }

        #region helpers etc
        // Utility method to receive one message from the WebSocket
        private async Task<string> ReceiveSingleMessage(ClientWebSocket clientWebSocket, TimeSpan? timeout = null)
        {
            var buffer = new byte[1024];
            using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(10));
            var result = await clientWebSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
            return Encoding.UTF8.GetString(buffer, 0, result.Count);
        }
        /* helper: waits (max 2.5 s) for the next TEXT frame ------------------- */
        private static async Task<string> ExpectTextAsync(ClientWebSocket ws,
                                                          string? expected = null,
                                                          int attempts = 5,
                                                          int delayMs = 500)
        {
            var buf = new byte[1024];

            for (int i = 0; i < attempts; i++)
            {
                var res = await ws.ReceiveAsync(buf, CancellationToken.None);

                if (res.MessageType == WebSocketMessageType.Close)
                    throw new InvalidOperationException($"socket closed: {res.CloseStatus}");

                if (res.MessageType == WebSocketMessageType.Text)
                {
                    var txt = Encoding.UTF8.GetString(buf, 0, res.Count);
                    if (expected is null || txt == expected) return txt;
                }

                await Task.Delay(delayMs);
            }

            throw new TimeoutException("No matching TEXT frame received.");
        }
        /* -------------------------------------------------------------------- */
        /* helper – waits ≤ 3 s for close-frame OR abort ----------------------- */
        static async Task AssertFirstSocketClosedAsync(ClientWebSocket ws)
        {
            var buf = new byte[1];
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                var res = await ws.ReceiveAsync(buf, cts.Token);

                // reached only when a proper close-frame arrived
                res.MessageType.Should().Be(WebSocketMessageType.Close);
                res.CloseStatus.Should().Be(WebSocketCloseStatus.NormalClosure);
                ws.State.Should().BeOneOf(WebSocketState.CloseReceived,
                                          WebSocketState.Closed);
            }
            catch (WebSocketException)        // abort = TCP FIN without close-frame
            {
                ws.State.Should().Be(WebSocketState.Aborted);
            }
            catch (OperationCanceledException)   // neither close nor abort – timeout
            {
                throw new Xunit.Sdk.XunitException("first socket was not terminated");
            }
        }
        private static async Task<string> ReceiveTextAsync(
            ClientWebSocket ws,
            TimeSpan? timeout = null)
        {
            timeout ??= TimeSpan.FromSeconds(10);          // ← default = 10 s
            var buf = new byte[1024];
            using var cts = new CancellationTokenSource(timeout.Value);

            var res = await ws.ReceiveAsync(new ArraySegment<byte>(buf), cts.Token);
            return Encoding.UTF8.GetString(buf, 0, res.Count);
        }

        private static async Task<bool> WasClosedOrAbortedAsync(ClientWebSocket ws, TimeSpan timeout)
        {
            var buf = new byte[1];
            try
            {
                using var cts = new CancellationTokenSource(timeout);
                var res = await ws.ReceiveAsync(buf, cts.Token);

                // proper close handshake
                return res.MessageType == WebSocketMessageType.Close ||
                       res.CloseStatus.HasValue;
            }
            catch (WebSocketException)
            {
                // server called Abort() → abrupt EOF
                return ws.State == WebSocketState.Aborted;
            }
            catch (OperationCanceledException)
            {
                // nothing happened within the timeout
                return false;
            }
        }
        private async Task<(string token, Guid pid, Guid sid, string mac)> IssueWsTokenAsync()
        {
            // 1) choose a persoid
            var pid = Guid.NewGuid();

            // 2) mint the token in the normal way
            var jwtSvc = _wsFixture.Host.Services.GetRequiredService<JwtService>();
            var result = await jwtSvc.CreateAccessTokenAsync(
                             persoid: pid,
                             email: $"{pid}@example.com",
                             roles: Array.Empty<string>(),
                             deviceId: "tests",
                             userAgent: "integration-test");

            // 3) decode the token to extract the *actual* sessionId claim
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(result.Token);

            var sidClaim = jwt.Claims.First(c => c.Type == "sessionId").Value;
            var sid = Guid.Parse(sidClaim);
            // the fixture registered WebSocketSettings with the same secret
            var wsCfg = _wsFixture.Host.Services.GetRequiredService<IOptions<WebSocketSettings>>().Value;
            var mac = WebSocketAuth.MakeWsMac(pid, sid, wsCfg.Secret);

            Logger.LogDebug("Generated AccessTokenResult: {@Result}", result);
            return (result.Token, pid, sid, mac);
        }
        private async Task<ClientWebSocket> ConnectAuthWebSocketAsync(string token, Guid pid, Guid sid, string mac, CancellationToken ct = default)
        {
            // build the URL exactly like your hook does
            var baseWs = _wsFixture.ServerAddress.Replace("http", "ws");
            var uri = new Uri($"{baseWs}/ws/auth?sid={sid}&pid={pid}&mac={mac}");

            var ws = new ClientWebSocket();
            // pass the JWT as a WS subprotocol
            ws.Options.AddSubProtocol("hmac-v1");
            await ws.ConnectAsync(uri, ct);
            return ws;
        }
        #endregion

    }




}



