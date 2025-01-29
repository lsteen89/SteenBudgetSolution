using Backend.Application.DTO;
using Backend.Domain.Shared;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserServices
    {
        Task<bool> RegisterUserAsync(UserCreationDto userCreationDto);
        Task<bool> SendVerificationEmailWithTokenAsync(string email);
        Task<OperationResult> VerifyEmailTokenAsync(Guid token);
        Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email);
        Task<bool> DeleteUserByEmailAsync(string email);
        Task<bool> DeleteUserTokenByEmailAsync(Guid persoid);
    }
}
