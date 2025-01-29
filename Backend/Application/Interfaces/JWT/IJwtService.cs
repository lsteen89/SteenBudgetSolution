using Backend.Application.DTO;
using System.Security.Claims;

namespace Backend.Application.Interfaces.JWT
{
    public interface IJwtService
    {
        ClaimsPrincipal? ValidateToken(string token);
        Task<LoginResultDto> GenerateJWTTokenAsync(string persoid, string email);
        Task BlacklistJwtTokenAsync(ClaimsPrincipal user);
    }
}
