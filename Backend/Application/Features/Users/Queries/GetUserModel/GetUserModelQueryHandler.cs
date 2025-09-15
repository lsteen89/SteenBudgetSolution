using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.User;
using Mapster;

namespace Backend.Application.Features.Users.Queries.GetUserModel;

public sealed class GetUserModelQueryHandler(IUserRepository users)
    : IQueryHandler<GetUserModelQuery, UserDto?>
{
    public async Task<UserDto?> Handle(GetUserModelQuery q, CancellationToken ct)
    {
        if (q.PersoId is null && string.IsNullOrWhiteSpace(q.Email))
            return null;

        var model = await users.GetUserModelAsync(q.PersoId, q.Email, ct);
        return model?.Adapt<UserDto>();
    }
}
