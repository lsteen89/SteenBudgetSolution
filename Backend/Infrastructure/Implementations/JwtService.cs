using Backend.Application.Common.Security;
using Backend.Application.Helpers.Jwt;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Domain.Entities.Auth;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Infrastructure.Security;
using Backend.Settings;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Infrastructure.Implementations
{
    [Obsolete("This is a god class. Must be refactored into smaller classes asap. Will most likely be a event and used with RabbitMQ in the future.")]
    public class JwtService : IJwtService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly TokenValidationParameters _jwtParams;
        private readonly ITokenBlacklistService _tokenBlacklistService;
        private readonly IRefreshTokenRepository _repo;
        private readonly ILogger<JwtService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ITimeProvider _timeProvider;

        public JwtService(
            JwtSettings jwtSettings,
            TokenValidationParameters jwtParams,
            ITokenBlacklistService tokenBlackListSerivce,
            IRefreshTokenRepository repo,
            ILogger<JwtService> logger,
            IHttpContextAccessor httpContextAccessor,
            ITimeProvider timeProvider)
        {
            _jwtSettings = jwtSettings;
            _jwtParams = jwtParams;
            _tokenBlacklistService = tokenBlackListSerivce;
            _repo = repo;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _timeProvider = timeProvider;
        }

        #region AccessToken
        public AccessTokenResult CreateAccessToken(
            Guid persoid,
            string email,
            IReadOnlyList<string> roles,
            string deviceId,
            string userAgent,
            Guid? sessionId = null)
        {
            // ... logic for effectiveSessionId and now ...
            var effectiveSessionId = sessionId ?? Guid.NewGuid();
            var now = _timeProvider.UtcNow;

            // ... logic for ttlMinutes and expUtc ...
            int ttlMinutes = _jwtSettings.ExpiryMinutes;
            DateTime expUtc = now.AddMinutes(ttlMinutes);

            // 2: build the claim model with the date values
            var jwtModel = TokenHelper.CreateTokenModel(
                persoid, effectiveSessionId, email, roles, deviceId, userAgent, now, expUtc);

            // 3: generate the JWT token
            string token = GenerateJwtAccessToken(jwtModel, expUtc);
            string tokenJti = TokenHelper.ExtractJtiAndExpiration(token).Jti;

            return new AccessTokenResult(token, tokenJti, effectiveSessionId, persoid, expUtc);
        }
        private string GenerateJwtAccessToken(
            JwtTokenModel jwtTokenModel,
            DateTime expiresUtc,
            IReadOnlyDictionary<string, string>? extraClaims = null)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey))
            { KeyId = "access-token-key-v1" };
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub,  jwtTokenModel.Persoid.ToString()),
                new(JwtRegisteredClaimNames.Email,jwtTokenModel.Email),
                new(JwtRegisteredClaimNames.Jti,  Guid.NewGuid().ToString()),
                new(JwtRegisteredClaimNames.Iat,  DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                    ClaimValueTypes.Integer64),
                new Claim("sessionId", jwtTokenModel.SessionId.ToString())
            };

            foreach (var r in jwtTokenModel.Roles)
                claims.Add(new Claim(ClaimTypes.Role, r));

            if (extraClaims is not null)
                foreach (var kv in extraClaims)
                    claims.Add(new Claim(kv.Key, kv.Value));

            _logger.LogDebug("Claims being added to JWT: {@Claims}", claims); // <--- ADD THIS LOGGING

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                notBefore: expiresUtc.AddMinutes(-_jwtSettings.ExpiryMinutes), // optional
                expires: expiresUtc,
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
        #endregion

        #region RefreshToken
        /// <summary>
        /// Creates a new JWT refresh token for the user.
        /// </summary>
        /// <returns>New refreshToken</returns>
        public string CreateRefreshToken()
        {
            // Generate a new refresh token
            var refreshToken = TokenGenerator.GenerateRefreshToken();
            return refreshToken;
        }
        #endregion

        #region Blacklist
        // ----------------------------------
        // Blacklist the access token by JTI
        // ----------------------------------
        // Token in this case is the full JWT token, not just the JTI.
        public async Task<bool> BlacklistJwtTokenAsync(string token, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(token))
                return false;

            // 1) Normalize: remove "Bearer " if present
            var raw = NormalizeToken(token);

            var handler = new JwtSecurityTokenHandler();
            // 2) Guard: make sure it’s a compact JWS/JWE
            if (!handler.CanReadToken(raw))
            {
                _logger.LogWarning("Malformed JWT token: {Token}", raw);
                return false;
            }

            try
            {
                // 3) Parse
                var jwt = handler.ReadJwtToken(raw);
                var jti = jwt.Id; // same as the Jti claim
                var expClaim = jwt.Claims
                                  .FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?
                                  .Value;

                // 4) Validate extraction
                if (string.IsNullOrEmpty(jti)
                    || !long.TryParse(expClaim, out var expUnix))
                {
                    _logger.LogWarning(
                        "BlacklistJwtTokenAsync: missing or invalid JTI/Exp on token {Jti}",
                        jti);
                    return false;
                }

                var expiration = DateTimeOffset
                                     .FromUnixTimeSeconds(expUnix)
                                     .UtcDateTime;

                // 5) Delegate to blacklist store
                var success = await _tokenBlacklistService
                                        .BlacklistTokenAsync(jti, expiration, ct);

                if (!success)
                {
                    _logger.LogWarning(
                        "Failed to insert blacklist entry for JTI {Jti}", jti);
                    return false;
                }

                _logger.LogInformation(
                    "Blacklisted JWT with JTI {Jti} until {Expiry}", jti, expiration);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while blacklisting JWT token.");
                return false;
            }
        }
        // Helper: remove "Bearer " prefix if present
        private static string NormalizeToken(string token) =>
            token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? token["Bearer ".Length..].Trim()
                : token.Trim();
        #endregion
        #region validate
        public ClaimsPrincipal? ValidateToken(string token, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(token))
                return null;

            try
            {
                // 1) Signature & lifetime (system clock) check
                var handler = new JwtSecurityTokenHandler();
                var principal = handler.ValidateToken(token, _jwtParams, out var validatedToken);

                // 2) Manual expiry check against ITimeProvider.UtcNow
                if (validatedToken is JwtSecurityToken jwtToken)
                {
                    if (_timeProvider.UtcNow > jwtToken.ValidTo)
                    {
                        _logger.LogInformation(
                          "ValidateToken: expired per ITimeProvider (now={Now}, exp={Exp})",
                          _timeProvider.UtcNow, jwtToken.ValidTo);
                        return null;
                    }
                }

                // 3) Blacklist
                var jti = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
                if (jti != null &&
                    _tokenBlacklistService
                      .IsTokenBlacklistedAsync(jti, ct)
                      .GetAwaiter()
                      .GetResult())
                {
                    _logger.LogWarning("ValidateToken: JTI {Jti} is blacklisted", jti);
                    return null;
                }

                return principal;
            }
            catch (SecurityTokenExpiredException ex)
            {
                _logger.LogInformation("ValidateToken: token expired (handler): {Msg}", ex.Message);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ValidateToken: invalid token");
                return null;
            }
        }

        #endregion
    }
}
