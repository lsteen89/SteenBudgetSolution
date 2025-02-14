using System.Net.WebSockets;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Backend.Application.Interfaces.WebSockets
{
    public interface IWebSocketHandler
    {
        Task HandleAsync(HttpContext context, WebSocket webSocket);
    }
}