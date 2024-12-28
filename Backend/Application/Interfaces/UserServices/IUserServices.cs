using Backend.Application.DTO;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserServices
    {
        Task<bool> RegisterUserAsync(UserCreationDto userCreationDto);
        Task<bool> SendVerificationEmailWithTokenAsync(string email);
        Task<LoginResultDto> LoginAsync(UserLoginDto userLoginDto, string ipAddress);
        Task<bool> VerifyEmailTokenAsync(Guid token);
        Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email);
        Task<bool> DeleteUserByEmailAsync(string email);
        Task<bool> DeleteUserTokenByEmailAsync(Guid persoid);
    }
}
