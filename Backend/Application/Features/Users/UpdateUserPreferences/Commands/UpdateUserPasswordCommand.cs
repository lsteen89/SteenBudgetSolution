using Backend.Application.Common.Behaviors;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Users.UpdateUserPreferences.Commands;

public sealed record UpdateUserPasswordCommand(
    string Email,
    string CurrentPassword,
    string NewPassword
) : IRequest<Result>, ITransactionalCommand;