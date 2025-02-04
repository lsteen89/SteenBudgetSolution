using Backend.Application.DTO;
using System.Security.Claims;

namespace Backend.Application.Interfaces.AuthService
{
    public interface IAuthService
    {
        Task<LoginResultDto> LoginAsync(UserLoginDto userLoginDto, string ipAddress);
        Task LogoutAsync(ClaimsPrincipal user, string accessToken);
        Task<LoginResultDto> RefreshTokenAsync(Guid persoid, string refreshToken, string accessToken, ClaimsPrincipal? user = null);
    }
}
