using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Infrastructure.Identity
{
    public static class JwtClaimHelper
    {
        /// <summary>Extracts the Persoid (“sub”) as <see cref="Guid"/> no matter
        /// whether Microsoft’s default inbound claim-type map is cleared or not.</summary>
        public static Guid GetPersoid(this ClaimsPrincipal principal)
        {
            var raw = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                   ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                   ?? throw new InvalidOperationException("Persoid claim missing");

            return Guid.Parse(raw);
        }

        /// <summary>Extracts the session-id claim written by <c>JwtService</c>.</summary>
        public static Guid GetSessionId(this ClaimsPrincipal principal)
        {
            var raw = principal.FindFirst("sessionId")?.Value
                   ?? throw new InvalidOperationException("sessionId claim missing");

            return Guid.Parse(raw);
        }
    }
}
