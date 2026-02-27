namespace Backend.Application.Options.Auth;

public sealed class HumanChallengeOptions
{
    public int WindowMinutes { get; init; } = 10;

    // Email-specific
    public int EmailFailsThreshold { get; init; } = 2;

    // IP-specific
    public int IpFailsThreshold { get; init; } = 10;

    // Combo (email+ip) is very strong signal
    public int EmailIpFailsThreshold { get; init; } = 3;
}