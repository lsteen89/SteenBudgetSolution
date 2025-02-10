using Backend.Application.DTO;
using Backend.Application.Models;
using Backend.Domain.Entities;
using System.Security.Claims;

namespace Backend.Application.Interfaces.JWT
{
    public interface IJwtService
    {
        ClaimsPrincipal? ValidateToken(string token);
        Task<LoginResultDto> GenerateJWTTokenAsync(JwtTokenModel jwtTokenModel, ClaimsPrincipal? user = null);
        Task<LoginResultDto> GenerateJWTTokenAsync(JwtRefreshTokenModel jwtRefreshTokenModel, ClaimsPrincipal? user = null);
        Task<bool> BlacklistJwtTokenAsync(string token);
        Task<bool> BlacklistTokenByJtiAsync(string jti, DateTime accessTokenExpiryDate);
        ClaimsPrincipal? DecodeExpiredToken(string token);
    }
}
