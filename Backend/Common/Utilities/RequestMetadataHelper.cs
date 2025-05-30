﻿namespace Backend.Common.Utilities
{
    public static class RequestMetadataHelper
    {
        public static (string IpAddress, string UserAgent, string DeviceId) ExtractMetadata(HttpContext context)
        {
            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
            var userAgent = context.Request.Headers["User-Agent"].ToString();
            if (string.IsNullOrEmpty(userAgent))
            {
                userAgent = "Unknown";
            }
            var deviceId = context.Request.Headers["X-Device-Id"].ToString();
            if (string.IsNullOrEmpty(deviceId))
            {
                deviceId = Guid.NewGuid().ToString();
            }
            return (ipAddress, userAgent, deviceId);
        }

        public static (string RefreshToken, string SessionId) ExtractTokensFromCookies(HttpContext context)
        {
            var refreshToken = context.Request.Cookies["RefreshToken"];
            var sessionId = context.Request.Cookies["SessionId"];
            return (refreshToken, sessionId);
        }
    }
}