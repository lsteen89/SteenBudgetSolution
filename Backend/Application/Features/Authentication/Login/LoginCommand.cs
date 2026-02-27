using Backend.Application.Abstractions.Messaging;
using Backend.Domain.Shared;
using Backend.Application.Features.Authentication.Shared.Models;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Authentication.Login;
/// <summary>
/// Command to handle user login.
/// </summary>
public sealed record LoginCommand(
    string Email,
    string Password,
    string? HumanToken,
    bool RememberMe,
    string? RemoteIp,
    string DeviceId,
    string UserAgent
) : ICommand<Result<IssuedAuthSession>>, ITransactionalCommand;