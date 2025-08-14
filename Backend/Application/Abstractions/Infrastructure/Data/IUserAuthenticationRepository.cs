using Backend.Application.Models.Auth;
using Backend.Domain.Entities.User;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IUserAuthenticationRepository
{
    Task<UserModel?> GetByEmailAsync(string email, CancellationToken ct);
    Task InsertFailedAttemptAsync(Guid persoId, string ip, string ua, DateTime atUtc, CancellationToken ct);
    Task<int> CountFailedAttemptsSinceAsync(string email, DateTime sinceUtc, CancellationToken ct);
    Task LockUserByEmailAsync(string email, DateTime untilUtc, CancellationToken ct);
    Task DeleteAttemptsByEmailAsync(string email, CancellationToken ct);
    Task<int> UnlockUserAsync(Guid persoid, CancellationToken ct);
    Task InsertLoginAttemptAsync(UserModel user, string ip, string userAgent, DateTime atUtc, CancellationToken ct);
}
