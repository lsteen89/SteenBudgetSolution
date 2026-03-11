using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;
using Backend.Application.Features.Authentication.Shared.Models;

namespace Backend.Application.Features.VerifyEmail;

public sealed record VerifyEmailCodeCommand(
    string Email,
    string Code,
    string DeviceId,
    string UserAgent,
    bool RememberMe)
    : ICommand<Result<IssuedAuthSession>>, ITransactionalCommand;
