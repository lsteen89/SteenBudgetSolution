
using Backend.Application.DTO.User;
using Backend.Application.Abstractions.Messaging;
namespace Backend.Application.Features.Users.Queries.GetUserModel;

public sealed record GetUserModelQuery(Guid? PersoId = null, string? Email = null)
    : IQuery<UserDto?>;