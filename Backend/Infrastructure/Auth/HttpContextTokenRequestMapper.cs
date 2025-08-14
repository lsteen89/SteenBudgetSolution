using Backend.Domain.Auth;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Infrastructure.Auth
{
    public static class HttpContextTokenRequestMapper
    {
        private const string SessionHeader = "X-Session-Id";
        private const string RefreshCookie = "RefreshToken";

        public static TokenRequestDto Map(this HttpContext ctx)
        {
            // 1) Access-token from “Authorization: Bearer …”
            var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault() ?? "";
            var accessToken = authHeader.StartsWith("Bearer ")
                ? authHeader["Bearer ".Length..].Trim()
                : null;

            // 2) Refresh-token from HttpOnly cookie
            var refreshToken = ctx.Request.Cookies[RefreshCookie];

            // 3) sessionId: try header, then JWT claim
            Guid sessionId = Guid.Empty;
            if (ctx.Request.Headers.TryGetValue(SessionHeader, out var hdr)
                && Guid.TryParse(hdr.First(), out var sidFromHdr))
            {
                sessionId = sidFromHdr;
            }
            else if (!string.IsNullOrEmpty(accessToken))
            {
                try
                {
                    var jwt = new JwtSecurityTokenHandler().ReadJwtToken(accessToken);
                    var claim = jwt.Claims
                                   .FirstOrDefault(c => c.Type.Equals("sessionId", StringComparison.OrdinalIgnoreCase));
                    if (claim is not null && Guid.TryParse(claim.Value, out var sidFromClaim))
                        sessionId = sidFromClaim;
                }
                catch { /* ignore malformed */ }
            }

            // 4) JTI from the JWT payload
            string? jti = null;
            if (!string.IsNullOrEmpty(accessToken))
            {
                try
                {
                    var jwt = new JwtSecurityTokenHandler().ReadJwtToken(accessToken);
                    jti = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;
                }
                catch { /* malformed → ignore */ }
            }

            return new TokenRequestDto(accessToken!, refreshToken!, sessionId, jti);
        }
    }
}
