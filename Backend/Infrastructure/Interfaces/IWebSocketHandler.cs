using System.Net.WebSockets;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Backend.Infrastructure.Interfaces
{
    public interface IWebSocketHandler
    {
        Task HandleAsync(HttpContext context, WebSocket webSocket);
    }
}