namespace Backend.Application.Options.Verification;

public sealed class VerificationCodeOptions
{
    public int TtlMinutes { get; init; } = 15;
    public int MaxAttempts { get; init; } = 5;
    public int LockMinutes { get; init; } = 15;

    public int ResendCooldownSeconds { get; init; } = 60;
    public int MaxSendsPerDay { get; init; } = 10;

    // 32+ bytes, base64
    public string CodeHmacKeyBase64 { get; init; } = "";
}
