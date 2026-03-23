using Backend.Application.DTO.User.Models;
using Backend.Application.Abstractions.Infrastructure.Data;
using MediatR;

namespace Backend.Application.Features.Users.GetUserPreferences.Queries;

public sealed class GetUserPreferencesQueryHandler
    : IRequestHandler<GetUserPreferencesQuery, UserPreferencesDto?>
{
    private readonly IUserRepository _userRepository;

    public GetUserPreferencesQueryHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserPreferencesDto?> Handle(GetUserPreferencesQuery request, CancellationToken ct)
    {
        var user = await _userRepository.GetUserModelAsync(persoid: null, email: request.Email, ct);
        if (user is null)
            return null;

        var settings = await _userRepository.GetUserPreferencesAsync(user.PersoId, ct);
        if (settings is null)
            return null;

        return new UserPreferencesDto
        {
            Locale = settings.Locale,
            Currency = settings.Currency
        };
    }
}