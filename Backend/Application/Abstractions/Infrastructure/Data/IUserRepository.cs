using Backend.Domain.Entities.User;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IUserRepository
{
    Task<bool> UserExistsAsync(string email, CancellationToken ct);
    Task<bool> CreateUserAsync(UserModel user, CancellationToken ct);
    Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct);
    Task<UserModel?> GetUserModelAsync(Guid? persoid = null, string? email = null, CancellationToken ct = default);
    Task<bool> SetFirstTimeLoginAsync(Guid persoid, CancellationToken ct);
}
