using System.Security.Claims;

namespace Backend.Common.Utilities
{
    public static class ClaimsPrincipalExtensions
    {
        public static string? GetEmail(this ClaimsPrincipal user)
        {
            return user.FindFirst("email")?.Value;
        }
    }
}
