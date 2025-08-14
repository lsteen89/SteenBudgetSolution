using System.Security.Cryptography;
using System.Text;

namespace Backend.Infrastructure.WebSockets;

public static class WebSocketAuth
{
    public static string MakeWsMac(Guid pid, Guid sid, string secret)
    {
        var bytes = Encoding.UTF8.GetBytes($"{pid}.{sid}");
        //using var h = new HMACSHA256(Convert.FromHexString(secret));
        //Changed to use UTF8 encoding for the secret. Enables easier configuration in appsettings.json
        //as it can be stored as a string instead of a hex string.
        using var h = new HMACSHA256(System.Text.Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(h.ComputeHash(bytes));
    }

    public static bool MacMatches(Guid pid, Guid sid, string mac, string secret) =>
        mac.Equals(MakeWsMac(pid, sid, secret), StringComparison.OrdinalIgnoreCase);
}