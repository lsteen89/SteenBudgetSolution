using Backend.Infrastructure.Entities.Tokens;
using System;

namespace Backend.Application.Models.Token
{
    /// <summary>
    ///  In-memory representation of a refresh-token row.
    ///  • Sliding window  = <see cref="ExpiresRollingUtc"/>  
    ///  • Absolute expiry = <see cref="ExpiresAbsoluteUtc"/>
    /// </summary>
    public sealed record JwtRefreshTokenModel
    (
        Guid TokenId,            // surrogate PK (BINARY(16))
        Guid Persoid,            // user
        Guid SessionId,          // device / browser
        string HashedToken,        // SHA-256 hex (raw value never stored)
        string AccessTokenJti,      // JTI of the access token that this refresh token is associated with
        DateTime ExpiresRollingUtc,  // refreshed on every rotation
        DateTime ExpiresAbsoluteUtc, // hard cap – never extended
        DateTime? RevokedUtc,        // set when user/device logs out
        TokenStatus Status,                // 0 = Inactive, 1 = Active, 2 = Revoked
        bool IsPersistent,        // true = persistent cookie, false = session cookie
        string? DeviceId,           // optional telemetry
        string? UserAgent,          // optional telemetry
        DateTime CreatedUtc          // audit baseline
    );
}
