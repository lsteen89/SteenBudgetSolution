using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using System.Security.Claims;

namespace Backend.Application.Interfaces.AuthService
{
    public interface IAuthService
    {
        Task<LoginResultDto> LoginAsync(UserLoginDto userLoginDto, string ipAddress, string deviceId, string userAgent);
        Task LogoutAsync(ClaimsPrincipal user, string accessToken, string refreshToken, string sessionId, bool logoutAll);
        Task<LoginResultDto> RefreshTokenAsync(string refreshToken, string sessionId, string userAgent, string deviceId, ClaimsPrincipal? user = null);
    }
}
