using Backend.Application.DTO;
using System.Security.Claims;

namespace Backend.Application.Interfaces.AuthService
{
    public interface IAuthService
    {
        Task<LoginResultDto> LoginAsync(UserLoginDto userLoginDto, string ipAddress);
        Task LogoutAsync(ClaimsPrincipal user, string accessToken, string refreshToken);
        Task<LoginResultDto> RefreshTokenAsync(string refreshToken, string accessToken, ClaimsPrincipal? user = null);
    }
}
