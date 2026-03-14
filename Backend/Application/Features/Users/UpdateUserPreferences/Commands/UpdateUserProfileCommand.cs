using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.User;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Users.UpdateUserPreferences.Commands;

public sealed record UpdateUserProfileCommand(
    string Email,
    string FirstName,
    string LastName
) : IRequest<Result<UserDto>>, ITransactionalCommand;