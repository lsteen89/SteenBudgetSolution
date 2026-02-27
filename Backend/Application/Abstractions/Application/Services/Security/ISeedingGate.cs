namespace Backend.Application.Abstractions.Application.Services.Security;

public interface ISeedingGate
{
    bool IsTrustedSeed(bool requestedSeeding);
}
