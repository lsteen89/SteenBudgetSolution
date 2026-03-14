using Backend.Application.DTO.User.Models;
using Backend.Application.Common.Behaviors;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Users.UpdateUserPreferences.Commands;

public sealed record UpdateUserPreferencesCommand(
    string Email,
    string Locale,
    string Currency
) : IRequest<Result<UserPreferencesDto>>, ITransactionalCommand;