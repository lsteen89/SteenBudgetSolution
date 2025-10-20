using Backend.Application.Abstractions.Messaging;
using Backend.Domain.Shared;
using Backend.Application.DTO.Auth;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Authentication.Login;
/// <summary>
/// Command to handle user login.
/// </summary>
public sealed record LoginCommand(
    string Email,
    string Password,
    string CaptchaToken,
    bool RememberMe,
    string Ip,
    string DeviceId,
    string UserAgent
) : ICommand<Result<AuthResult>>, ITransactionalCommand;