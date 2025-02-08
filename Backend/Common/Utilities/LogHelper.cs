using Backend.Domain.Entities;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;

namespace Backend.Common.Utilities
{
    public static class LogHelper
    {
        public static string CreateUserLogHelper(UserModel user)
        {
            StringBuilder createUserErrorLog = new StringBuilder();
            foreach (PropertyInfo property in user.GetType().GetProperties())
            {
                if (property.Name == "Password")
                {
                    continue;
                }
                var value = property.GetValue(user, null) ?? "NULL";
                createUserErrorLog.AppendLine($"{property.Name}: {value}");
            }
            return createUserErrorLog.ToString();
        }

        public static string MaskEmail(string email)
        {
            var parts = email.Split('@');
            if (parts.Length != 2) return email;
            var localPart = parts[0].Length > 3 ? parts[0].Substring(0, 3) + "****" : parts[0];
            return $"{localPart}@{parts[1]}";
        }

        public static string MaskIp(string ipAddress)
        {
            if (string.IsNullOrWhiteSpace(ipAddress))
                return "Unknown";

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
