using Backend.Domain.Entities.User;
using System.Net;
using System.Net.Sockets;
using Backend.Settings;
using System.Text;

namespace Backend.Common.Utilities
{
    public static class LogHelper
    {
    public static string CreateUserLogHelper(UserModel user)
    {
        var sb = new StringBuilder();
        foreach (var prop in user.GetType().GetProperties())
        {
            if (prop.Name == nameof(user.Password))
                continue;

            var raw = prop.GetValue(user)?.ToString() ?? "NULL";
            string val = prop.Name switch
            {
                nameof(user.Email)     when LoggingSettings.MaskSensitiveData 
                                           => MaskEmail(raw),

            };
            sb.AppendLine($"{prop.Name}: {val}");
        }
        return sb.ToString();
    }

        public static string MaskEmail(string email)
        {
            if (!LoggingSettings.MaskSensitiveData)
                return email;

            var parts = email.Split('@');
            if (parts.Length != 2) return email;
            var localPart = parts[0].Length > 3 ? parts[0].Substring(0, 3) + "****" : parts[0];
            return $"{localPart}@{parts[1]}";
        }

        public static string MaskIp(string ipAddress)
        {
            if (string.IsNullOrWhiteSpace(ipAddress))
                return "Unknown";

            if (!LoggingSettings.MaskSensitiveData)
                return ipAddress;

            if (IPAddress.TryParse(ipAddress, out var ip))
            {
                if (ip.AddressFamily == AddressFamily.InterNetwork)
                {
                    // IPv4: Mask the last octet (e.g., "192.168.1.xxx")
                    var segments = ipAddress.Split('.');
                    if (segments.Length == 4)
                    {
                        segments[3] = "xxx";
                        return string.Join(".", segments);
                    }
                }
                else if (ip.AddressFamily == AddressFamily.InterNetworkV6)
                {
                    // IPv6: Mask the last segment (e.g., "2001:0db8:85a3:0000:0000:8a2e:0370:xxxx")
                    var segments = ipAddress.Split(':');
                    if (segments.Length > 0)
                    {
                        segments[segments.Length - 1] = "xxxx";
                        return string.Join(":", segments);
                    }
                }
            }
            return ipAddress;
        }
    }
}
