using Backend.Domain.Shared;
using Backend.Application.DTO.Auth;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;
using Backend.Application.Features.Authentication.Shared.Models;

namespace Backend.Application.Features.Authentication.RefreshToken;

public sealed record RefreshTokensCommand(
    string? AccessToken,
    string RefreshCookie,
    string UserAgent,
    string DeviceId
) : ICommand<Result<IssuedAuthSession>>, ITransactionalCommand;