public sealed class AuthLockoutOptions
{
    public int WindowMinutes { get; init; } = 15;   // sliding window
    public int MaxAttempts   { get; init; } = 5;    // attempts before lock
    public int LockoutMinutes{ get; init; } = 15;   // lock duration
}
