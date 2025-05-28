using Backend.Application.Common.Security;
using Backend.Application.DTO.Auth;
using Backend.Application.Models.Token;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Entities.Tokens;
using System.Data.Common;
using System.Security.Claims;

namespace Backend.Application.Interfaces.JWT
{
    public interface IJwtService
    {
        Task<AccessTokenResult> CreateAccessTokenAsync(Guid persoid, string email, IReadOnlyList<string> roles, string deviceId, string userAgent, Guid? sessionId = null);
        Task<string> CreateRefreshToken();
        Task<bool> UpsertRefreshTokenAsync(RefreshJwtTokenEntity newRow, DbConnection conn, DbTransaction tx);
        Task<bool> ExpireRefreshTokenAsync(Guid persoid, Guid sessionId, DbConnection conn, DbTransaction tx);
        Task<bool> BlacklistJwtTokenAsync(string token, DbConnection conn, DbTransaction tx);
        ClaimsPrincipal? ValidateToken(string token);

    }
}
