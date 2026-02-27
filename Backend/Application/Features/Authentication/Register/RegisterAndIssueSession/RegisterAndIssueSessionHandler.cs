using MediatR;
using Backend.Domain.Shared;
using Backend.Application.Features.Shared.Issuers.Auth;
using Backend.Application.Features.Authentication.Shared.Models;
using Backend.Application.Features.Authentication.Register.Orchestrator;
using Backend.Domain.Errors.User;
using Backend.Application.Abstractions.Application.Services.Security;

namespace Backend.Application.Features.Authentication.Register.RegisterAndIssueSession;

public sealed class RegisterAndIssueSessionHandler
    : IRequestHandler<RegisterAndIssueSessionCommand, Result<IssuedAuthSession?>>
{
    private readonly IRegistrationOrchestrator _registration;
    private readonly IAuthSessionIssuer _issuer;
    private readonly ISeedingGate _seedingGate;

    public RegisterAndIssueSessionHandler(IRegistrationOrchestrator registration, IAuthSessionIssuer issuer, ISeedingGate seedingGate)
    {
        _registration = registration;
        _issuer = issuer;
        _seedingGate = seedingGate;
    }

    public async Task<Result<IssuedAuthSession?>> Handle(RegisterAndIssueSessionCommand cmd, CancellationToken ct)
    {
        var trustedSeed = _seedingGate.IsTrustedSeed(cmd.IsSeedingOperation);

        if (cmd.IsSeedingOperation && !trustedSeed)
            return Result<IssuedAuthSession?>.Failure(UserErrors.SeedingNotAllowed);

        var reg = await _registration.RegisterAsync(
            cmd.FirstName, cmd.LastName, cmd.Email, cmd.Password,
            cmd.HumanToken, cmd.Honeypot, cmd.RemoteIp,
            trustedSeed,
            ct);

        if (reg.IsFailure)
            return Result<IssuedAuthSession?>.Failure(reg.Error);

        if (reg.Value!.IsHoneypot || reg.Value.User is null)
            return Result<IssuedAuthSession?>.Success(null);

        var issued = await _issuer.IssueAsync(
            reg.Value.User,
            rememberMe: false,
            deviceId: cmd.DeviceId,
            userAgent: cmd.UserAgent,
            ct);

        return Result<IssuedAuthSession?>.Success(issued);
    }
}