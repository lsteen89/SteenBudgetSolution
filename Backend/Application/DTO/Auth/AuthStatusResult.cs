using Microsoft.AspNetCore.Http; // Required if CookieOptions were to remain, but we're removing it.
using System;

namespace Backend.Application.DTO.Auth
{
    public record AuthStatusResult
    {
        public bool Authenticated { get; init; }
        public string? AccessToken { get; init; } // Nullable if Fail() doesn't provide it
        public Guid SessionId { get; init; }      // Nullable if Fail() doesn't provide it
        public Guid Persoid { get; init; }        // Nullable if Fail() doesn't provide it
        public DateTime ExpiresUtc { get; init; }

        public string? NewRefreshCookie { get; init; } // This is the raw string value of the new refresh token
        public bool ShouldBePersistent { get; init; } // This flag indicates if the NewRefreshCookie should be set as persistent

        public static AuthStatusResult Fail() =>
            new() { Authenticated = false };

        public static AuthStatusResult Success(
            string access,
            Guid sessionId,
            Guid persoid,
            DateTime expiresUtc, // Expiry of AT or RT record in DB
            bool shouldBePersistent, //  persistence intent
            string? refreshCookie = null // The new refresh token string
        ) => new()
        {
            Authenticated = true,
            AccessToken = access,
            SessionId = sessionId,
            Persoid = persoid,
            ExpiresUtc = expiresUtc,
            NewRefreshCookie = refreshCookie,
            ShouldBePersistent = shouldBePersistent
        };
    }
}