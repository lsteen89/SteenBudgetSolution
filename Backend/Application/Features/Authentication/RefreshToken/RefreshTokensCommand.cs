using Backend.Domain.Shared;
using Backend.Application.DTO.Auth;
using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Commands.Auth.RefreshToken;

public sealed record RefreshTokensCommand(
    string? AccessToken,
    string RefreshCookie,
    Guid SessionId,
    string UserAgent,
    string DeviceId
) : ICommand<Result<AuthResult>>, ITransactionalCommand;