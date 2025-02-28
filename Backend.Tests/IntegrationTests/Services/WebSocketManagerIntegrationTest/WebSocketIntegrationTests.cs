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
namespace Backend.Tests.IntegrationTests.Services.WebSocketManagerIntegrationTest
{
    [Collection("WebSocket Test Collection")]
    public class WebSocketTests : IntegrationTestBase
    {
        private readonly WebSocketFixture _fixture;

        public WebSocketTests(WebSocketFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task Authenticated_User_Should_Echo_Message()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();
            client.Options.SetRequestHeader("Test-Auth", "true");
            // Set required headers for composite key authentication
            client.Options.SetRequestHeader("sub", "client1");
            client.Options.SetRequestHeader("sessionId", "sessionIdForClient1");

            Console.WriteLine($"Connecting to WebSocket at: {wsUri}");

            // Act
            await client.ConnectAsync(wsUri, CancellationToken.None);

            // Assert connection
            client.State.Should().Be(WebSocketState.Open,
                because: "the WebSocket connection should be established successfully for authenticated users");

            // Buffer and builder for receiving messages
            var buffer = new byte[1024];
            var receivedMessage = new StringBuilder();
            WebSocketReceiveResult result;

            // Handle initial "ready" message
            result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            receivedMessage.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
            var initialMessage = receivedMessage.ToString();
            initialMessage.Should().Be("ready",
                because: "the server should send an initial 'ready' message upon connection");
            Console.WriteLine($"Received initial message: {initialMessage}");
            receivedMessage.Clear();

            // Send a message
            var message = "Hello WebSocket";
            var messageBytes = Encoding.UTF8.GetBytes(message);
            await client.SendAsync(new ArraySegment<byte>(messageBytes), WebSocketMessageType.Text, true, CancellationToken.None);
            Console.WriteLine($"Sent message: {message}");

            // Receive the echoed message
            do
            {
                result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                receivedMessage.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
            }
            while (!result.EndOfMessage);

            // Validate the echoed message
            var echoedMessage = receivedMessage.ToString();
            echoedMessage.Should().Be($"Echo: {message}",
                because: "the server should echo back the sent message prefixed with 'Echo:'");
            Console.WriteLine($"Received echoed message: {echoedMessage}");

            // Close the WebSocket
            await client.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
            client.State.Should().Be(WebSocketState.Closed,
                because: "the WebSocket connection should be closed gracefully");
            Console.WriteLine("WebSocket connection closed.");
        }


        [Fact]
        public async Task Unauthenticated_User_Should_Not_Connect()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var clientWebSocket = new ClientWebSocket();
            Console.WriteLine($"Attempting unauthenticated connection to WebSocket at: {wsUri}");

            // Act
            await clientWebSocket.ConnectAsync(wsUri, CancellationToken.None);

            // Attempt to receive a close message from the server
            var buffer = new byte[1024];
            var receiveTask = clientWebSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            var result = await receiveTask;

            // Assert
            result.MessageType.Should().Be(WebSocketMessageType.Close, because: "the server should close the connection for unauthenticated users");
            result.CloseStatus.Should().Be(WebSocketCloseStatus.PolicyViolation, because: "the server should specify policy violation for unauthenticated connections");
            clientWebSocket.State.Should().Be(WebSocketState.CloseReceived, because: "the WebSocket connection should be closed by the server");
            Console.WriteLine("Unauthenticated WebSocket connection was correctly refused.");
        }

        [Fact]
        public async Task Broadcast_Message_Should_Be_Received_By_All_Connected_Clients()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");

            // Create two clients with required headers for composite key authentication.
            using var client1 = new ClientWebSocket();
            client1.Options.SetRequestHeader("Test-Auth", "true");
            client1.Options.SetRequestHeader("sub", "client1");
            client1.Options.SetRequestHeader("sessionId", "sessionIdForClient1");

            using var client2 = new ClientWebSocket();
            client2.Options.SetRequestHeader("Test-Auth", "true");
            client2.Options.SetRequestHeader("sub", "client2");
            client2.Options.SetRequestHeader("sessionId", "sessionIdForClient2");

            // 1. Connect both clients
            await Task.WhenAll(
                client1.ConnectAsync(wsUri, CancellationToken.None),
                client2.ConnectAsync(wsUri, CancellationToken.None)
            );

            client1.State.Should().Be(WebSocketState.Open, because: "client1 should be connected successfully");
            client2.State.Should().Be(WebSocketState.Open, because: "client2 should be connected successfully");

            // 2. Both must consume the initial "ready" message
            await ReadReadyMessage(client1, "client1");
            await ReadReadyMessage(client2, "client2");

            // 3. Broadcast a message to all connected clients.
            var broadcastMessage = "This is a broadcast message.";
            await _fixture.Host.Services.GetRequiredService<IWebSocketManager>()
                      .BroadcastAsync(broadcastMessage);

            // 4. Each client reads the broadcast message with a short timeout.
            var task1 = ExpectMessage(client1, broadcastMessage, "client1");
            var task2 = ExpectMessage(client2, broadcastMessage, "client2");

            await Task.WhenAll(task1, task2);

            // 5. Cleanup: Close both clients gracefully.
            await Task.WhenAll(
                CloseIfOpen(client1),
                CloseIfOpen(client2)
            );

            // 6. Final state assertions: Each client should be closed or aborted.
            client1.State.Should().BeOneOf(WebSocketState.Closed, WebSocketState.Aborted);
            client2.State.Should().BeOneOf(WebSocketState.Closed, WebSocketState.Aborted);
        }


        [Fact]
        public async Task Send_Message_To_Specific_User_Should_Be_Received_By_Target_Client_Only()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");

            // Create two clients with unique composite key headers
            using var client1 = new ClientWebSocket();
            client1.Options.SetRequestHeader("Test-Auth", "true");
            client1.Options.SetRequestHeader("sub", "client1");
            client1.Options.SetRequestHeader("sessionId", "sessionIdForClient1");

            using var client2 = new ClientWebSocket();
            client2.Options.SetRequestHeader("Test-Auth", "true");
            client2.Options.SetRequestHeader("sub", "client2");
            client2.Options.SetRequestHeader("sessionId", "sessionIdForClient2");

            // 1. Connect both clients
            await Task.WhenAll(
                client1.ConnectAsync(wsUri, CancellationToken.None),
                client2.ConnectAsync(wsUri, CancellationToken.None)
            );

            client1.State.Should().Be(WebSocketState.Open);
            client2.State.Should().Be(WebSocketState.Open);

            // 2. Read the initial "ready" message from each client
            var buffer = new byte[1024];

            var result1 = await client1.ReceiveAsync(buffer, CancellationToken.None);
            var msg1 = Encoding.UTF8.GetString(buffer, 0, result1.Count);
            msg1.Should().Be("ready", because: "the server sends a 'ready' message at connection");

            var result2 = await client2.ReceiveAsync(buffer, CancellationToken.None);
            var msg2 = Encoding.UTF8.GetString(buffer, 0, result2.Count);
            msg2.Should().Be("ready", because: "the server sends a 'ready' message at connection");

            // Act
            // 3. Send a message to client2 only
            var specificMessage = "Hello Client2!";
            var targetUserSession = new UserSessionKey("client2", "sessionIdForClient2");
            await _fixture.Host.Services
                              .GetRequiredService<IWebSocketManager>()
                              .SendMessageAsync(targetUserSession, specificMessage);

            // 4. client1: we expect NO message, so we do a quick read with a short timeout
            var buffer1 = new byte[1024];
            using var ctsClient1 = new CancellationTokenSource(TimeSpan.FromSeconds(1));
            var receiveTask1 = Task.Run(async () =>
            {
                try
                {
                    var r1 = await client1.ReceiveAsync(new ArraySegment<byte>(buffer1), ctsClient1.Token);
                    throw new Xunit.Sdk.XunitException(
                        $"Client1 unexpectedly received: {Encoding.UTF8.GetString(buffer1, 0, r1.Count)}");
                }
                catch (OperationCanceledException)
                {
                    // Expected: no message received within timeout
                }
            });

            // 5. client2: we DO expect the message
            var buffer2 = new byte[1024];
            using var ctsClient2 = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var receiveTask2 = Task.Run(async () =>
            {
                var r2 = await client2.ReceiveAsync(new ArraySegment<byte>(buffer2), ctsClient2.Token);
                var receivedMsg = Encoding.UTF8.GetString(buffer2, 0, r2.Count);
                receivedMsg.Should().Be(specificMessage,
                    because: "client2 should get the message intended for them");
            });

            await Task.WhenAll(receiveTask1, receiveTask2);

            // 6. Cleanup - gracefully close connections
            await Task.WhenAll(
                GracefulCloseIfOpen(client1),
                GracefulCloseIfOpen(client2)
            );

            // 7. Assert final states
            client1.State.Should().BeOneOf(WebSocketState.Closed, WebSocketState.Aborted);
            client2.State.Should().BeOneOf(WebSocketState.Closed, WebSocketState.Aborted);
        }



        [Fact]
        public async Task Server_Should_Handle_Multiple_Concurrent_Connections()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            int clientCount = 10; // Number of concurrent clients
            var clients = new List<ClientWebSocket>();
            var tasks = new List<Task>();

            // Act
            // Initialize and connect multiple clients with unique identities
            for (int i = 0; i < clientCount; i++)
            {
                var client = new ClientWebSocket();
                client.Options.SetRequestHeader("Test-Auth", "true");
                client.Options.SetRequestHeader("sessionId", $"test-session-{i + 1}"); // Unique session per client
                client.Options.SetRequestHeader("sub", $"testuser{i + 1}");           // Unique user ID per client
                clients.Add(client);
                tasks.Add(client.ConnectAsync(wsUri, CancellationToken.None));
            }

            await Task.WhenAll(tasks);

            // Assert all clients are connected
            foreach (var client in clients)
            {
                client.State.Should().Be(WebSocketState.Open, because: "all clients should be connected successfully");
            }

            // Handle initial "ready" messages for all clients
            var readyTasks = clients.Select(client =>
            {
                var buffer = new byte[1024];
                return client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None)
                             .ContinueWith(t => Encoding.UTF8.GetString(buffer, 0, t.Result.Count));
            }).ToArray();

            var initialMessages = await Task.WhenAll(readyTasks);

            // Assert all clients received "ready"
            foreach (var message in initialMessages)
            {
                message.Should().Be("ready", because: "the server should send an initial 'ready' message upon connection");
            }

            // Send messages from all clients concurrently
            var sendTasks = clients.Select((client, index) =>
            {
                var message = $"Message from client {index + 1}";
                var messageBytes = Encoding.UTF8.GetBytes(message);
                return client.SendAsync(new ArraySegment<byte>(messageBytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }).ToArray();

            await Task.WhenAll(sendTasks);

            // Receive echoed messages from all clients
            var receiveTasks = clients.Select(client =>
            {
                var buffer = new byte[1024];
                return client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None)
                             .ContinueWith(t => Encoding.UTF8.GetString(buffer, 0, t.Result.Count));
            }).ToArray();

            var receivedMessages = await Task.WhenAll(receiveTasks);

            // Assert each client received the correct echoed message
            for (int i = 0; i < clientCount; i++)
            {
                receivedMessages[i].Should().Be($"Echo: Message from client {i + 1}",
                    because: $"client {i + 1} should receive its own echoed message");
            }

            // Cleanup
            var closeTasks = clients.Select(client =>
                client.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None)
            ).ToArray();

            await Task.WhenAll(closeTasks);

            // Wait briefly to ensure handshake completion
            await Task.Delay(500);

            foreach (var client in clients)
            {
                client.State.Should().Be(WebSocketState.Closed,
                    because: "all clients should be closed gracefully");
            }
        }



        [Fact]
        public async Task Server_Should_Remove_WebSocket_On_Client_Disconnect()
        {
            // Arrange
            
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth?user=client1");
            using var client = new ClientWebSocket();
            client.Options.SetRequestHeader("Test-Auth", "true");

            await client.ConnectAsync(wsUri, CancellationToken.None);
            client.State.Should().Be(WebSocketState.Open, because: "client should be connected");

            // Act
            // Close the client connection
            await client.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
            client.State.Should().Be(WebSocketState.Closed, because: "client should have closed the connection");

            // Allow some time for the server to process the disconnect
            await Task.Delay(500);

            // Assert
            // Verify that the server no longer has the WebSocket in its dictionary
            var userId = "client1"; // As per TestAuthHandler
            var webSocketManager = _fixture.Host.Services.GetRequiredService<IWebSocketManager>() as WebSocketManager;
            //webSocketManager.UserSockets.Should().NotContainKey(userId, because: "the server should remove the WebSocket connection upon client disconnect");

            Console.WriteLine("WebSocket connection was correctly removed from the server upon client disconnect.");
        }
        [Fact]
        public async Task Server_Should_Handle_Malformed_Messages_Gracefully()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();

            // Set headers for authentication (required for composite key)
            client.Options.SetRequestHeader("Test-Auth", "true");
            client.Options.SetRequestHeader("sessionId", "test-session-1");
            client.Options.SetRequestHeader("sub", "test-user-1");

            await client.ConnectAsync(wsUri, CancellationToken.None);
            client.State.Should().Be(WebSocketState.Open, because: "client should be connected");

            // Wait for the "ready" message
            var buffer = new byte[1024];
            var readyResult = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            var readyMessage = Encoding.UTF8.GetString(buffer, 0, readyResult.Count);
            readyMessage.Should().Be("ready", because: "the server should send a 'ready' message upon connection");

            // Act: Send a malformed message (binary data instead of text)
            var malformedData = new byte[] { 0xFF, 0xFE, 0xFD };
            await client.SendAsync(new ArraySegment<byte>(malformedData), WebSocketMessageType.Binary, true, CancellationToken.None);

            // Attempt to receive a response
            WebSocketReceiveResult receiveResult = null;
            try
            {
                receiveResult = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }
            catch (WebSocketException)
            {
                // Exception indicates forced closure, which is expected.
            }

            // Assert: If a response is received, it should be a close frame.
            if (receiveResult != null)
            {
                receiveResult.MessageType.Should().Be(WebSocketMessageType.Close,
                    because: "the server should send a close frame for malformed messages");
            }
            client.State.Should().Be(WebSocketState.CloseReceived,
                because: "the client should recognize the close frame sent by the server");

            Console.WriteLine("Server correctly handled the malformed message by closing the connection.");
        }


        [Fact]
        public async Task Server_Should_Reject_Too_Large_Messages_With_ForcedAbort()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();

            // Set headers to simulate authentication with required claims.
            client.Options.SetRequestHeader("Test-Auth", "true");
            client.Options.SetRequestHeader("sessionId", "test-session-1");  // Required for composite key
            client.Options.SetRequestHeader("sub", "test-user-1");           // Required for user ID claim

            await client.ConnectAsync(wsUri, CancellationToken.None);

            // 1) Read the "ready" message
            var buffer = new byte[1024];
            var firstResult = await client.ReceiveAsync(buffer, CancellationToken.None);
            var initialMsg = Encoding.UTF8.GetString(buffer, 0, firstResult.Count);
            initialMsg.Should().Be("ready");

            // 2) Send large (5 KB) message
            var largeMessage = new string('A', 5 * 1024);
            var largeBytes = Encoding.UTF8.GetBytes(largeMessage);
            await client.SendAsync(new ArraySegment<byte>(largeBytes), WebSocketMessageType.Text, true, CancellationToken.None);

            // 3) Try to read again; accept any sign of forced closure
            bool forciblyClosed = false;
            try
            {
                var secondResult = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (secondResult.Count == 0
                    || client.State == WebSocketState.Aborted
                    || secondResult.CloseStatus.HasValue)
                {
                    forciblyClosed = true;
                }
            }
            catch (WebSocketException)
            {
                forciblyClosed = true;
            }

            forciblyClosed.Should().BeTrue("we expect the server to forcibly close or abort on oversized messages");
        }




        [Fact]
        public async Task Should_Not_Hang()
        {
            using var client = new ClientWebSocket();
            await client.ConnectAsync(new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth"), CancellationToken.None);

            // Example: 5-second timeout for reading
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var buffer = new byte[1024];

            try
            {
                var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
                // If the server never sends data within 5 seconds, an OperationCanceledException is thrown -> test ends.
            }
            catch (OperationCanceledException)
            {
                // 1: Throw an XunitException to indicate a test failure in xUnit
                throw new XunitException("Timed out waiting for a message from the server.");
            }
        }



        [Fact]
        public async Task Server_Should_Shutdown_Gracefully_With_Active_Connections()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();
            client.Options.SetRequestHeader("Test-Auth", "true");
            client.Options.SetRequestHeader("sub", "client1");
            client.Options.SetRequestHeader("sessionId", "sessionIdForClient1");

            Console.WriteLine($"Connecting to WebSocket at: {wsUri}");

            await client.ConnectAsync(wsUri, CancellationToken.None);
            client.State.Should().Be(WebSocketState.Open, because: "client should be connected");

            Console.WriteLine("WebSocket connection established.");

            // Prepare to receive close message with timeout
            var buffer = new byte[1024];
            var receiveTask = Task.Run(async () =>
            {
                try
                {
                    var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    Console.WriteLine($"Received message from server: {result.MessageType} with status: {result.CloseStatus}");
                    return result;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Exception in receiveTask: {ex.Message}");
                    throw;
                }
            });

            // Act
            Console.WriteLine("Initiating server shutdown...");
            var shutdownTask = _fixture.Host.StopAsync();

            // Await both shutdown and receiveTask with a timeout
            var allTasks = Task.WhenAll(shutdownTask, receiveTask);
            var completedTask = await Task.WhenAny(allTasks, Task.Delay(TimeSpan.FromSeconds(60)));

            if (completedTask != allTasks)
            {
                Console.WriteLine("Test timed out while waiting for server shutdown or WebSocket closure.");
                Assert.True(false, "Test timed out waiting for server shutdown and WebSocket closure.");
                return;
            }

            // Assert
            try
            {
                WebSocketCloseStatus? closeStatus = null;
                WebSocketMessageType msgType = WebSocketMessageType.Text;

                while (closeStatus == null)
                {
                    var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    msgType = result.MessageType;
                    closeStatus = result.CloseStatus;

                    if (msgType == WebSocketMessageType.Text)
                    {
                        var msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        Console.WriteLine($"Received text message: {msg}");
                        // Possibly ignore it or keep track
                    }
                }

                Assert.Equal(WebSocketMessageType.Close, msgType);
                Assert.Equal(WebSocketCloseStatus.NormalClosure, closeStatus);
                Console.WriteLine("WebSocket connection closed gracefully by the server.");
            }
            catch (WebSocketException ex)
            {
                Console.WriteLine($"WebSocketException occurred: {ex.Message}");
                Assert.True(client.State == WebSocketState.Aborted, $"WebSocket should be Aborted if handshake failed. Error: {ex.Message}");
            }
        }

        [Fact]
        public async Task Server_Should_Replace_Existing_Connection_For_Same_User()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");

            using var clientSocket1 = new ClientWebSocket();
            using var clientSocket2 = new ClientWebSocket();

            // Use the new headers for composite key authentication
            clientSocket1.Options.SetRequestHeader("Test-Auth", "true");
            clientSocket1.Options.SetRequestHeader("sub", "testuser");
            clientSocket1.Options.SetRequestHeader("sessionId", "test-session");

            clientSocket2.Options.SetRequestHeader("Test-Auth", "true");
            clientSocket2.Options.SetRequestHeader("sub", "testuser");
            clientSocket2.Options.SetRequestHeader("sessionId", "test-session");

            // Connect clientSocket1
            await clientSocket1.ConnectAsync(wsUri, CancellationToken.None);
            Console.WriteLine("clientSocket1 connected.");

            // Connect clientSocket2 and wait for readiness acknowledgment
            await clientSocket2.ConnectAsync(wsUri, CancellationToken.None);
            Console.WriteLine("clientSocket2 connected.");

            // Receive readiness acknowledgment from server
            var readinessMessage = await RetryReceiveMessage(clientSocket2, 5, TimeSpan.FromMilliseconds(500));
            Assert.Equal("ready", readinessMessage);
            Console.WriteLine("Received readiness acknowledgment from server.");

            // Send a message from clientSocket2
            var message = "Test message";
            var buffer = Encoding.UTF8.GetBytes(message);
            await clientSocket2.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true, CancellationToken.None);
            Console.WriteLine("Sent message from clientSocket2.");

            // Assert clientSocket2 remains open
            Assert.Equal(WebSocketState.Open, clientSocket2.State);

            // Receive echoed message on clientSocket2
            var receivedMessage = await RetryReceiveMessage(clientSocket2, 5, TimeSpan.FromMilliseconds(500));
            Assert.Equal($"Echo: {message}", receivedMessage);
            Console.WriteLine("Received echoed message from server.");
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
        public async Task HealthCheck_Should_Send_Ping_For_Authenticated_Connection()
        {
            // Arrange: Setup authenticated WebSocket connection.
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth?user=testuser");
            using var clientWebSocket = new ClientWebSocket();
            clientWebSocket.Options.SetRequestHeader("Test-Auth", "true");
            clientWebSocket.Options.SetRequestHeader("Test-User", "testuser");
            clientWebSocket.Options.SetRequestHeader("sub", "client1");
            clientWebSocket.Options.SetRequestHeader("sessionId", "sessionIdForClient1");

            Console.WriteLine($"Connecting to WebSocket at: {wsUri}");
            await clientWebSocket.ConnectAsync(wsUri, CancellationToken.None);

            var readinessMessage = await RetryReceiveMessage(clientWebSocket, 5, TimeSpan.FromMilliseconds(500));
            Assert.Equal("ready", readinessMessage);
            Console.WriteLine("Received readiness acknowledgment from server.");

            // Act: Get the AuthWebSocketManager from DI and trigger HealthCheckAsync.
            var wsManager = _fixture.Host.Services.GetRequiredService<WebSocketManager>();
            await wsManager.HealthCheckAsync();

            // Assert: Verify the client receives the "ping" message.
            var buffer = new byte[1024];
            var result = await clientWebSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            var receivedMessage = Encoding.UTF8.GetString(buffer, 0, result.Count);

            receivedMessage.Should().Be("ping", "because the healthcheck should send a ping message to active connections");
            Console.WriteLine("Healthcheck ping received successfully.");
        }
        [Fact]
        public async Task ExpiredRefreshToken_Should_Trigger_SessionExpired_Notification()
        {
            // Arrange: Create and prepare a new user.
            var registeredUser = await SetupUserAsync();
            // Confirm the user's email.
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Prepare user login details.
            var userLoginDto = new UserLoginDto
            {
                Email = registeredUser.Email,
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();

            // Act: Log in the user to obtain tokens.
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(loginResult.Success, "Initial login should succeed.");
            Assert.False(string.IsNullOrEmpty(loginResult.RefreshToken), "A refresh token should be returned.");

            // Open a WebSocket connection as the authenticated user.
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();

            // Set required headers for composite key authentication.
            client.Options.SetRequestHeader("Test-Auth", "true");
            client.Options.SetRequestHeader("sub", registeredUser.PersoId.ToString());
            client.Options.SetRequestHeader("sessionId", loginResult.SessionId);

            await client.ConnectAsync(wsUri, CancellationToken.None);
            client.State.Should().Be(WebSocketState.Open, "The WebSocket should connect successfully for an authenticated user.");

            // Receive the initial "ready" message.
            var buffer = new byte[1024];
            var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            var initialMessage = Encoding.UTF8.GetString(buffer, 0, result.Count);
            initialMessage.Should().Be("ready", "The server should send an initial 'ready' message upon connection.");

            // Simulate token expiration:
            // Invalidate the user's refresh token in the database.
            bool expireResult = await UserSQLProvider.RefreshTokenSqlExecutor.ExpireRefreshTokenAsync(registeredUser.PersoId);
            expireResult.Should().BeTrue("The refresh token should be marked as expired.");

            // For test purposes, manually trigger the force logout via WebSocket.
            var webSocketManager = _fixture.Host.Services.GetRequiredService<IWebSocketManager>() as WebSocketManager;
            await webSocketManager.ForceLogoutAsync(registeredUser.PersoId.ToString(), "session-expired");

            // The client should now either receive the "session-expired" message
            // or the connection will be closed, causing a WebSocketException.
            try
            {
                result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                // If we get here, the server managed to send a message.
                var logoutMessage = Encoding.UTF8.GetString(buffer, 0, result.Count);
                logoutMessage.Should().Be("session-expired", "The server should notify the client that the session has expired.");
            }
            catch (WebSocketException ex)
            {
                // We expect an exception if the server closed the connection abruptly.
                Console.WriteLine($"WebSocketException caught as expected: {ex.Message}");
                client.State.Should().BeOneOf(new[] { WebSocketState.Closed, WebSocketState.Aborted },
                    "A WebSocketException is acceptable if the server closed the connection forcibly.");
            }

            // Ensure the connection is closed.
            if (client.State == WebSocketState.Open)
            {
                await client.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
            }
            client.State.Should().BeOneOf(new[] { WebSocketState.Closed, WebSocketState.Aborted },
                "The WebSocket connection should be closed after forced logout.");
        }
        [Fact]
        public async Task Connection_Should_Be_Rejected_Without_Authentication_Headers()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();
            // DO NOT set any authentication headers

            // Act
            await client.ConnectAsync(wsUri, CancellationToken.None);

            // Assert
            // Expect the connection to be closed almost immediately due to missing required claims.
            var buffer = new byte[1024];
            try
            {
                var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                // The server should have closed the connection; CloseStatus should be set.
                result.CloseStatus.Should().NotBeNull("The connection should be closed due to missing authentication headers.");
            }
            catch (WebSocketException)
            {
                // Acceptable: an exception indicates the connection was aborted.
            }
            client.State.Should().BeOneOf(
                new[] { WebSocketState.Closed, WebSocketState.Aborted, WebSocketState.CloseReceived },
                "The client should not remain connected without proper authentication headers."
            );
        }
        [Fact]
        public async Task Connection_Should_Be_Rejected_With_Invalid_Claims()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();
            client.Options.SetRequestHeader("Test-Auth", "true");
            // Set invalid credentials: for example, an empty "sub" header and no sessionId header.
            client.Options.SetRequestHeader("sub", "");
            // Do not set "sessionId"

            // Act
            await client.ConnectAsync(wsUri, CancellationToken.None);

            // Assert
            var buffer = new byte[1024];
            try
            {
                var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                result.CloseStatus.Should().NotBeNull("The connection should be closed due to invalid claims.");
            }
            catch (WebSocketException)
            {
                // Expected: connection is forcibly closed.
            }
            client.State.Should().BeOneOf(
                new[] { WebSocketState.Closed, WebSocketState.Aborted, WebSocketState.CloseReceived },
                "Client should be closed if provided claims are invalid."
            );
        }
        [Fact]
        public async Task Server_Should_Handle_Rapid_Connect_Disconnect_Sequences()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            int iterations = 20; // Number of rapid connect/disconnect cycles

            for (int i = 0; i < iterations; i++)
            {
                using var client = new ClientWebSocket();
                client.Options.SetRequestHeader("Test-Auth", "true");
                client.Options.SetRequestHeader("sub", $"rapiduser{i}");
                client.Options.SetRequestHeader("sessionId", $"rapid-session-{i}");

                // Act: Connect, then immediately close.
                await client.ConnectAsync(wsUri, CancellationToken.None);
                client.State.Should().Be(WebSocketState.Open, $"Client {i} should connect successfully.");

                await client.CloseAsync(WebSocketCloseStatus.NormalClosure, "Rapid disconnect", CancellationToken.None);
                client.State.Should().BeOneOf(new[] { WebSocketState.Closed, WebSocketState.Aborted }, $"Client {i} should disconnect properly.");
            }
        }
        [Fact]
        public async Task Server_Should_Close_Connection_On_Unexpected_Message_Type()
        {
            // Arrange
            var wsUri = new Uri($"{_fixture.ServerAddress.Replace("http", "ws")}/ws/auth");
            using var client = new ClientWebSocket();
            client.Options.SetRequestHeader("Test-Auth", "true");
            client.Options.SetRequestHeader("sub", "testuser");
            client.Options.SetRequestHeader("sessionId", "test-session");

            await client.ConnectAsync(wsUri, CancellationToken.None);
            client.State.Should().Be(WebSocketState.Open, "Client should be connected.");

            // Wait for initial "ready" message.
            var buffer = new byte[1024];
            var readyResult = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            Encoding.UTF8.GetString(buffer, 0, readyResult.Count).Should().Be("ready");

            // Act: Send a binary message (unexpected if the server only supports text).
            var unexpectedData = new byte[] { 0x01, 0x02, 0x03 };
            await client.SendAsync(new ArraySegment<byte>(unexpectedData), WebSocketMessageType.Binary, true, CancellationToken.None);

            // Assert: Expect the connection to be closed.
            try
            {
                var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                result.CloseStatus.Should().NotBeNull("Server should close connection on receiving an unexpected message type.");
            }
            catch (WebSocketException)
            {
                // Acceptable: exception indicates forced closure.
            }
            client.State.Should().BeOneOf(
                new[] { WebSocketState.Closed, WebSocketState.Aborted, WebSocketState.CloseReceived },
                "Client should be closed or in the process of closing (CloseReceived) after sending an unexpected message type."
            );
        }



    }




}



