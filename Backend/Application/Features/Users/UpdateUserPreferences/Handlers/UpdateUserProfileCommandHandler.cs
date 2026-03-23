using Backend.Application.Features.Users.UpdateUserPreferences.Commands;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using MediatR;
using Backend.Application.DTO.User;

namespace Backend.Application.Features.Users.UpdateUserProfile.Handlers;

public sealed class UpdateUserProfileCommandHandler
    : IRequestHandler<UpdateUserProfileCommand, Result<UserDto>>
{
    private readonly IUserRepository _users;

    public UpdateUserProfileCommandHandler(IUserRepository users)
    {
        _users = users;
    }

    public async Task<Result<UserDto>> Handle(UpdateUserProfileCommand request, CancellationToken ct)
    {
        var user = await _users.GetUserModelAsync(email: request.Email, ct: ct);
        if (user is null || user.PersoId == Guid.Empty)
            return Result<UserDto>.Failure(new Error("User.NotFound", "User not found."));

        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();

        if (string.IsNullOrWhiteSpace(firstName))
            return Result<UserDto>.Failure(new Error("User.FirstNameRequired", "First name is required."));

        if (string.IsNullOrWhiteSpace(lastName))
            return Result<UserDto>.Failure(new Error("User.LastNameRequired", "Last name is required."));

        var ok = await _users.UpdateUserProfileAsync(user.PersoId, firstName, lastName, ct);

        if (!ok)
        {
            return Result<UserDto>.Failure(
                new Error("User.ProfileUpdateFailed", "Could not update user profile.")
            );
        }

        var updated = await _users.GetUserModelAsync(email: request.Email, ct: ct);
        if (updated is null)
        {
            return Result<UserDto>.Failure(
                new Error("User.NotFoundAfterUpdate", "User not found after update.")
            );
        }

        return Result<UserDto>.Success(new UserDto
        {
            FirstName = updated.FirstName,
            LastName = updated.LastName,
            Email = updated.Email,
            Persoid = updated.PersoId,
            Roles = new List<string> { "1" }.AsReadOnly(), // TODO: ROLES - Currently hardcoded to "1" until role logic is implemented
            FirstLogin = updated.FirstLogin,
            LastLogin = updated.LastLoginUtc,

        });
    }
}