using MediatR;
using Backend.Domain.Shared;
using Backend.Application.Features.Authentication.Shared.Models;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Authentication.Register.RegisterAndIssueSession;

public sealed record RegisterAndIssueSessionCommand(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string HumanToken,
    string Honeypot,
    string Locale,
    string? RemoteIp,
    string DeviceId,
    string UserAgent
) : IRequest<Result<IssuedAuthSession?>>, ITransactionalCommand
{
    public bool IsSeedingOperation { get; init; } = false;
}