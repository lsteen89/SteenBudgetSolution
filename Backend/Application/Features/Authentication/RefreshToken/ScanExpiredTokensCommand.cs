using MediatR;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Commands.Auth.RefreshToken;

public sealed record ScanExpiredTokensCommand
    : IRequest<Unit>, ITransactionalCommand;
