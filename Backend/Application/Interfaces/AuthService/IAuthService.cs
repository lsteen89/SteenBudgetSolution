using Backend.Application.DTO;
using System.Security.Claims;

namespace Backend.Application.Interfaces.AuthService
{
    public interface IAuthService
    {
        Task<LoginResultDto> LoginAsync(UserLoginDto userLoginDto, string ipAddress, string deviceId, string userAgent);
        Task LogoutAsync(ClaimsPrincipal user, string accessToken, string refreshTokenm, bool logoutAll);
        Task<LoginResultDto> RefreshTokenAsync(string refreshToken, string accessToken, string userAgent, string deviceId, ClaimsPrincipal? user = null);
    }
}
