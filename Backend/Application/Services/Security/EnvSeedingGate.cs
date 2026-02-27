using Backend.Application.Abstractions.Application.Services.Security;

namespace Backend.Application.Services.Security;

public sealed class EnvSeedingGate : ISeedingGate
{
    private readonly IHostEnvironment _env;

    public EnvSeedingGate(IHostEnvironment env) => _env = env;

    public bool IsTrustedSeed(bool requestedSeeding)
    {
        if (!requestedSeeding) return false;
        if (_env.IsProduction()) return false;

        return string.Equals(
            Environment.GetEnvironmentVariable("ALLOW_SEEDING"),
            "true",
            StringComparison.OrdinalIgnoreCase);
    }
}