using Backend.Domain.Entities.User;
using Backend.Domain.Entities.Email;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IUserRepository
{
    Task<bool> UserExistsAsync(string email, CancellationToken ct);
    Task<bool> CreateUserAsync(UserModel user, CancellationToken ct);
    Task<EmailRegistrationState> GetEmailRegistrationStateAsync(
        string email,
        CancellationToken ct = default);
    Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct);
    Task<UserModel?> GetUserModelAsync(Guid? persoid = null, string? email = null, CancellationToken ct = default);
    Task<bool> SetFirstTimeLoginAsync(Guid persoid, CancellationToken ct);
    Task<bool> UpsertUserPreferencesAsync(Guid persoId, string locale, string currency, CancellationToken ct = default);
    Task<UserPreferencesReadModel?> GetUserPreferencesAsync(Guid persoid, CancellationToken ct = default);
    Task<bool> UpdatePasswordAsync(Guid persoId, string passwordHash, CancellationToken ct);
    Task<bool> UpdateUserProfileAsync(Guid persoId, string firstName, string lastName, CancellationToken ct = default);
}
