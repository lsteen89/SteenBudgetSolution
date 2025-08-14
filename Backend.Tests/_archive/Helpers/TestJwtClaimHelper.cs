using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Tests.Helpers
{
    internal static class TestJwtClaimHelper
    {
        public static Guid GetPersoid(this ClaimsPrincipal p)
            => Guid.Parse(p.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                       ?? p.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
    }
}
