using Backend.Application.DTO.Auth;
using Backend.Application.Models.Token;
using Backend.Domain.Entities.Auth;
using System.Data.Common;
using System.Security.Claims;

namespace Backend.Application.Interfaces.JWT
{
    public interface IJwtService
    {
        ClaimsPrincipal? ValidateToken(string token);
        Task<LoginResultDto> GenerateJWTTokenAsync(JwtTokenModel jwtTokenModel, DbTransaction tx, ClaimsPrincipal? user = null);
        Task<LoginResultDto> GenerateJWTTokenAsync(JwtRefreshTokenModel jwtRefreshTokenModel, DbTransaction tx, ClaimsPrincipal? user = null);
        Task<bool> BlacklistJwtTokenAsync(string token);
        Task<bool> BlacklistTokenByJtiAsync(string jti, DateTime accessTokenExpiryDate, DbTransaction tx);
        ClaimsPrincipal? DecodeExpiredToken(string token);
    }
}
