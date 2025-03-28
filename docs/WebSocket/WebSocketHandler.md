# WebSocketHandler Documentation

## Overview
The `WebSocketHandler` class implements the `IWebSocketHandler` interface and provides functionality to manage WebSocket connections in the backend. It is responsible for handling incoming messages from clients, processing commands (such as logout requests), and sending appropriate responses.

## Key Features
- **Connection Management**: Establishes and maintains a WebSocket connection.
- **Message Handling**: Listens for incoming messages in a loop while the connection is open.
- **Logout Command Processing**: If a client sends a "logout" message (case-insensitive), the handler responds with a "LOGOUT" message.
- **Graceful Closure**: Detects when the client requests to close the connection and closes the WebSocket gracefully.
- **Error Logging**: Logs connection events and errors for monitoring and debugging.

## Code Walkthrough
1. **Initialization**
   - The constructor accepts an `ILogger<WebSocketHandler>` for logging.
   - The `HandleAsync` method serves as the main entry point for handling a WebSocket connection.

2. **Connection Handling**
   - A buffer (4 KB) is allocated to receive messages.
   - The handler logs when a WebSocket connection is established.
   - A loop continues to read messages as long as the WebSocket's state is open.

3. **Message Processing**
   - The handler uses `ReceiveAsync` to wait for incoming data.
   - When a message is received:
     - If the message type is `Close`, the handler logs that the connection is closing and closes it gracefully.
     - If the message type is `Text`, the message is decoded from UTF-8.
     - If the received text equals "logout" (case-insensitive), the handler sends a "LOGOUT" response back to the client and logs the action.
   - Additional message types or commands can be handled as needed.

4. **Error Handling**
   - Any exceptions during message reception or processing are caught and logged.
   - The loop breaks if an error occurs, leading to the closure of the WebSocket.

5. **Connection Closure**
   - Once the loop exits, the handler logs that the WebSocket connection has been closed.

## Usage Example
The `WebSocketHandler` is intended to be used in a middleware or endpoint that accepts WebSocket connections. For example, in an ASP.NET Core application:

public async Task Invoke(HttpContext context) { if (context.WebSockets.IsWebSocketRequest) { using WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync(); var handler = new WebSocketHandler(logger); await handler.HandleAsync(context, webSocket); } else { // Handle non-WebSocket requests await _next(context); } }



## Conclusion
The `WebSocketHandler` provides a robust and extensible foundation for managing WebSocket connections. It ensures that messages from clients are processed correctly, that logout commands are handled immediately, and that errors are logged for troubleshooting. This implementation is designed to be simple and can be extended to support additional features as needed.
