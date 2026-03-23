using Backend.Application.DTO.User.Models;
using Backend.Application.Features.Users.UpdateUserPreferences.Commands;
using Backend.Domain.Common;
using Backend.Domain.Common.Constants;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Users.UpdateUserPreferences.Handlers;

public sealed class UpdateUserPreferencesCommandHandler
    : IRequestHandler<UpdateUserPreferencesCommand, Result<UserPreferencesDto>>
{
    private readonly IUserRepository _users;

    public UpdateUserPreferencesCommandHandler(IUserRepository users)
    {
        _users = users;
    }

    public async Task<Result<UserPreferencesDto>> Handle(UpdateUserPreferencesCommand request, CancellationToken ct)
    {
        var user = await _users.GetUserModelAsync(email: request.Email, ct: ct);
        if (user is null || user.PersoId == Guid.Empty)
            return Result<UserPreferencesDto>.Failure(new Error("User.NotFound", "User not found."));

        var safeLocale = UserPreferenceDefaults.NormalizeLocaleOrDefault(request.Locale);

        if (!AppCurrencies.IsSupported(request.Currency))
        {
            return Result<UserPreferencesDto>.Failure(
                new Error("UserPreferences.InvalidCurrency", "Invalid currency.")
            );
        }

        var ok = await _users.UpsertUserPreferencesAsync(
            user.PersoId,
            safeLocale,
            request.Currency,
            ct
        );

        if (!ok)
        {
            return Result<UserPreferencesDto>.Failure(
                new Error("UserPreferences.UpdateFailed", "Could not update user preferences.")
            );
        }

        return Result<UserPreferencesDto>.Success(new UserPreferencesDto
        {
            Locale = safeLocale,
            Currency = request.Currency
        });
    }
}