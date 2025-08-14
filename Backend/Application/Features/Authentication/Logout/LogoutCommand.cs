using MediatR;

namespace Backend.Application.Features.Commands.Auth.Logout;

public sealed record LogoutCommand(
    string AccessToken,
    string? RefreshCookie,
    Guid SessionId,
    bool LogoutAll,
    string UserAgent,
    string DeviceId
) : IRequest<Unit>, ITransactionalCommand;