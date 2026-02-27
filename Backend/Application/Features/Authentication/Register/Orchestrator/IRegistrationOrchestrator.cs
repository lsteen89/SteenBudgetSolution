using Backend.Domain.Shared;
using Backend.Application.Features.Authentication.Register.Shared.Models;

namespace Backend.Application.Features.Authentication.Register.Orchestrator;

public interface IRegistrationOrchestrator
{
    Task<Result<RegistrationOutcome>> RegisterAsync(
        string firstName,
        string lastName,
        string email,
        string password,
        string humanToken,
        string honeypot,
        string? remoteIp,
        bool trustedSeed,
        CancellationToken ct);
}