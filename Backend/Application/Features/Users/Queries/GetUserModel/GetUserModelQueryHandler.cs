using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.User;
using Backend.Application.Features.Users.Queries.GetUserModel;
using MapsterMapper;

public sealed class GetUserModelQueryHandler
    : IQueryHandler<GetUserModelQuery, UserDto?>
{
    private readonly IUserRepository _users;
    private readonly IMapper _mapper;

    public GetUserModelQueryHandler(IUserRepository users, IMapper mapper)
    {
        _users = users;
        _mapper = mapper;
    }

    public async Task<UserDto?> Handle(GetUserModelQuery q, CancellationToken ct)
    {
        if (q.PersoId is null && string.IsNullOrWhiteSpace(q.Email))
            throw new ArgumentException("PersoId or Email is required.");

        var model = await _users.GetUserModelAsync(q.PersoId, q.Email, ct);
        return model is null ? null : _mapper.Map<UserDto>(model);
    }
}
