using Backend.Application.DTO.User.Models;
using MediatR;

namespace Backend.Application.Features.Users.GetUserPreferences.Queries;

public sealed record GetUserPreferencesQuery(string Email) : IRequest<UserPreferencesDto?>;