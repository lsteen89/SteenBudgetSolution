using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.WebSockets
{
    internal static class WebSocketEndpoints
    {
        public static async Task Auth(HttpContext ctx, CancellationToken ct)
        {
            var q = ctx.Request.Query;
            if (!Guid.TryParse(q["pid"], out var pid) ||
                !Guid.TryParse(q["sid"], out var sid) ||
                string.IsNullOrEmpty(q["mac"]))
            {
                ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
                await ctx.Response.WriteAsync("Bad query");
                return;
            }

            var cfg = ctx.RequestServices.GetRequiredService<IOptions<WebSocketSettings>>().Value;
            if (!WebSocketAuth.MacMatches(pid, sid, q["mac"]!, cfg.Secret))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await ctx.Response.WriteAsync("Bad MAC");
                return;
            }

            var ws = await ctx.WebSockets.AcceptWebSocketAsync("hmac-v1");
            await ctx.RequestServices.GetRequiredService<IWebSocketManager>()
                                     .HandleConnectionAsync(ws, pid, sid, ct);
        }
    }
}
