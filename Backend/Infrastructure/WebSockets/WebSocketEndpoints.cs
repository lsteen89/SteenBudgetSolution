using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.WebSockets
{
    internal static class WebSocketEndpoints
    {
        public static async Task Auth(HttpContext ctx, CancellationToken ct)
        {
            if (!ctx.WebSockets.IsWebSocketRequest)
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                await ctx.Response.WriteAsync("Not a websocket request");
                return;
            }

            // tolerant & explicit parsing
            var q = ctx.Request.Query;
            var uidS = q["uid"].FirstOrDefault();
            var sidS = q["sid"].FirstOrDefault();
            var mac = q["mac"].FirstOrDefault();

            if (!Guid.TryParse(uidS, out var uid))
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                await ctx.Response.WriteAsync("Bad uid");
                return;
            }
            if (!Guid.TryParse(sidS, out var sid))
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                await ctx.Response.WriteAsync("Bad sid");
                return;
            }
            if (string.IsNullOrWhiteSpace(mac))
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                await ctx.Response.WriteAsync("Bad mac");
                return;
            }

            var wsCfg = ctx.RequestServices.GetRequiredService<IOptions<WebSocketSettings>>().Value;
            if (!WebSocketAuth.MacMatches(uid, sid, mac, wsCfg.Secret))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await ctx.Response.WriteAsync("Bad MAC");
                return;
            }

            // negotiate subprotocol only if requested
            var wantsHmacV1 = ctx.WebSockets.WebSocketRequestedProtocols.Contains("hmac-v1");
            var ws = wantsHmacV1
                ? await ctx.WebSockets.AcceptWebSocketAsync("hmac-v1")
                : await ctx.WebSockets.AcceptWebSocketAsync();

            try
            {
                var mgr = ctx.RequestServices.GetRequiredService<IWebSocketManager>();
                // prefer the request's abort token; it is cancelled on disconnect
                await mgr.HandleConnectionAsync(ws, uid, sid, ctx.RequestAborted);
            }
            catch (Exception ex)
            {
                ctx.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("WS.Auth")
                    .LogError(ex, "WS handle failed uid={Uid} sid={Sid}", uid, sid);

                if (ws.State == System.Net.WebSockets.WebSocketState.Open)
                    await ws.CloseAsync(System.Net.WebSockets.WebSocketCloseStatus.InternalServerError,
                                        "server error", ctx.RequestAborted);
            }
        }
    }
}
