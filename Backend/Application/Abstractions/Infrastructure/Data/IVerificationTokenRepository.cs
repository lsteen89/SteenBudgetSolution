using Backend.Domain.Entities.Auth;

// Summary:
// This interface defines methods for managing verification tokens in the authentication system.
// It includes methods for creating a single active token for a user, retrieving a token by its GUID
// and deleting all tokens associated with a user.

// A verification token is a unique identifier used to confirm a user's identity during the authentication process.
// Not to be confused with refresh tokens, which are used to obtain new access tokens without requiring the user to log in again.
namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IVerificationTokenRepository
{
    Task<int> UpsertSingleActiveAsync(Guid persoid, Guid token, DateTime expiryUtc, CancellationToken ct);
    Task<UserTokenModel?> GetByTokenAsync(Guid token, CancellationToken ct);
    Task<UserTokenModel?> GetByUserAsync(Guid persoid, CancellationToken ct);
    Task<int> DeleteByTokenAsync(Guid token, CancellationToken ct);
    Task<int> DeleteAllForUserAsync(Guid persoid, CancellationToken ct);
}
