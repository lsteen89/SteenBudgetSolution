using Backend.Application.Common.Security;
using System.Security.Claims;

namespace Backend.Application.Abstractions.Infrastructure.Security
{
    public interface IJwtService
    {
        AccessTokenResult CreateAccessToken(Guid persoid, string email, IReadOnlyList<string> roles, string deviceId, string userAgent, Guid? sessionId = null);
        string CreateRefreshToken();
        Task<bool> BlacklistJwtTokenAsync(string token, CancellationToken ct = default);
        ClaimsPrincipal? ValidateToken(string token, CancellationToken ct, bool allowExpired);


    }
}
