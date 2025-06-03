using Backend.Application.Common.Security;
using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using System.Data.Common;
using System.Security.Claims;

namespace Backend.Application.Interfaces.AuthService
{
    public interface IAuthService
    {
        // Login/Logout
        Task<LoginOutcome> LoginAsync(UserLoginDto dto, string ip, string deviceId, string ua);
        Task LogoutAsync(string accessToken, string refreshToken, Guid sessionId, bool logoutAllUsers);

        // RefreshToken and check access token
        Task<AuthStatusResult> CheckAndRefreshAsync(string accessToken, string refreshCookie, Guid sessionId, string userAgent, string deviceId, DbConnection cn, DbTransaction tx);
        Task<(string token, Guid tokenId, DateTime exp)> IssueAsync(UserCtx ctx, string jti, bool rememberMe);
    }
}
