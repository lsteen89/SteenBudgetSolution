namespace Backend.Infrastructure.Entities.Email;

public sealed class EmailRateLimitRow
{
    // SHA-256 hash of your logical key, e.g. "user:{guid}" or "contact:{email}" or "contact-ip:{ip}"
    public byte[] KeyHash { get; set; } = Array.Empty<byte>(); // BINARY(32)

    // Stored as tinyint in DB. Map to your EmailKind enum in the app layer if you want.
    public byte Kind { get; set; }

    // The UTC calendar date bucket (DATE column)
    public DateOnly DateUtc { get; set; }

    public int SentCount { get; set; }

    // Last sent timestamp in UTC (DATETIME)
    public DateTime LastSentAtUtc { get; set; }
}
