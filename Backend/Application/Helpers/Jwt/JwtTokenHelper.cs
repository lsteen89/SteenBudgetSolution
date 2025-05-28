using Backend.Application.Interfaces.JWT;
using Backend.Domain.Entities.Auth;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Application.Helpers.Jwt
{
    public static class TokenHelper
    {
        public static JwtTokenModel CreateTokenModel(Guid persoid, Guid sessionId, string email, IReadOnlyList<string> roles, string deviceId, string userAgent)
        {
            return new JwtTokenModel
            {
                Persoid = persoid,
                SessionId = sessionId,
                Email = email,
                Roles = roles,
                DeviceId = deviceId,
                UserAgent = userAgent,

            };
        }
        public static (string Jti, DateTime? Expiration) ExtractJtiAndExpiration(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                throw new ArgumentException("Token must be provided", nameof(token));

            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
            var jti = jwt.Id;
            var expClaim = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?.Value;

            if (!long.TryParse(expClaim, out var expUnix))
                return (jti, null);

            var exp = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
            return (jti, exp);
        }
        public static Guid GetUserIdFromToken(string? accessToken)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
                return Guid.Empty;

            try
            {
                var handler = new JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(accessToken);
                var sub = jwt.Claims
                                 .FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?
                                 .Value;

                if (Guid.TryParse(sub, out var userId))
                    return userId;
            }
            catch
            {
                // Todo: Some log here in future?
            }

            return Guid.Empty;
        }
    }
}
