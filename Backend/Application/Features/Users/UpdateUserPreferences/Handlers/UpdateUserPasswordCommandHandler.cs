using Backend.Application.Features.Users.UpdateUserPreferences.Commands;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Application.Services.Security;
using MediatR;

namespace Backend.Application.Features.Users.UpdateUserPassword.Handlers;

public sealed class UpdateUserPasswordCommandHandler
    : IRequestHandler<UpdateUserPasswordCommand, Result>
{
    private readonly IUserRepository _users;
    private readonly IPasswordService _passwordSerice;

    public UpdateUserPasswordCommandHandler(
        IUserRepository users,
        IPasswordService passwordService)
    {
        _users = users;
        _passwordSerice = passwordService;
    }

    public async Task<Result> Handle(UpdateUserPasswordCommand request, CancellationToken ct)
    {
        var user = await _users.GetUserModelAsync(email: request.Email, ct: ct);
        if (user is null || user.PersoId == Guid.Empty)
            return Result.Failure(new Error("User.NotFound", "User not found."));

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            return Result.Failure(new Error("Auth.CurrentPasswordRequired", "Current password is required."));

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            return Result.Failure(new Error("Auth.NewPasswordInvalid", "New password is invalid."));

        bool passwordOk = _passwordSerice.Verify(request.CurrentPassword, user.Password);

        if (!passwordOk)
        {
            return Result.Failure(new Error("Auth.InvalidCurrentPassword", "Current password is incorrect."));
        }

        var newHash = _passwordSerice.Hash(request.NewPassword);

        var ok = await _users.UpdatePasswordAsync(user.PersoId, newHash, ct);
        if (!ok)
        {
            return Result.Failure(new Error("Auth.PasswordUpdateFailed", "Could not update password."));
        }

        return Result.Success();
    }
}