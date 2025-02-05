using Backend.Application.DTO;
using System.Security.Claims;

namespace Backend.Application.Interfaces.JWT
{
    public interface IJwtService
    {
        ClaimsPrincipal? ValidateToken(string token);
        Task<LoginResultDto> GenerateJWTTokenAsync(Guid persoid, string email, bool rotateToken, ClaimsPrincipal? user = null);
        Task<bool> BlacklistJwtTokenAsync(string token);
    }
}
