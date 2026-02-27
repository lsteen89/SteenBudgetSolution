namespace Backend.Application.Options.Verification;

public sealed class TurnstileOptions
{
    public string SecretKey { get; init; } = "";
    public string VerifyUrl { get; init; } = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    public bool Enabled { get; init; } = true;
}
