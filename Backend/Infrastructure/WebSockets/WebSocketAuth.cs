using System.Security.Cryptography;
using System.Text;

namespace Backend.Infrastructure.WebSockets;

public static class WebSocketAuth
{
    public static string MakeWsMac(Guid pid, Guid sid, string secret)
    {
        var bytes = Encoding.UTF8.GetBytes($"{pid}.{sid}");
        using var h = new HMACSHA256(Convert.FromHexString(secret));
        return Convert.ToHexString(h.ComputeHash(bytes));
    }

    public static bool MacMatches(Guid pid, Guid sid, string mac, string secret) =>
        mac.Equals(MakeWsMac(pid, sid, secret), StringComparison.OrdinalIgnoreCase);
}