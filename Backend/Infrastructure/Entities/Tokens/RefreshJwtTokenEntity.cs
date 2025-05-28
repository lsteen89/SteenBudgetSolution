namespace Backend.Infrastructure.Entities.Tokens
{
    public sealed class RefreshJwtTokenEntity
    {
        /* PK */
        public Guid TokenId { get; init; } = Guid.NewGuid(); // UUID v4

        /* Identity */
        public Guid Persoid { get; init; }
        public Guid SessionId { get; init; }

        /* Security & lifetime */
        public string HashedToken { get; init; } = string.Empty; // SHA-256
        public string AccessTokenJti { get; init; }
        public DateTime ExpiresRollingUtc { get; init; }                 // sliding window
        public DateTime ExpiresAbsoluteUtc { get; init; }                 // hard cap
        public DateTime? RevokedUtc { get; set; }                  // NULL = active
        public TokenStatus Status { get; set; } = TokenStatus.Active;

        /* Telemetry (optional) */
        public string? DeviceId { get; init; }
        public string? UserAgent { get; init; }

        /* Audit */
        public DateTime CreatedUtc { get; init; } = DateTime.UtcNow;
    }
    public enum TokenStatus
    {
        Inactive = 0,
        Active = 1,
        Revoked = 2
    }
}
