using Backend.Application.DTO;
using Backend.Domain.Entities.Auth;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserTokenService
    {
        Task<string> GenerateAndSaveVerificationTokenAsync(Guid persoid, CancellationToken ct);
        Task<UserTokenModel?> GetTokenAsync(Guid token, CancellationToken ct);
        Task<int> DeleteAllForUserAsync(Guid persoid, CancellationToken ct);
    }
}
