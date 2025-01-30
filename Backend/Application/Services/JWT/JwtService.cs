using Backend.Application.DTO;
using Backend.Application.Interfaces.JWT;
using Backend.Infrastructure.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Application.Configuration;
namespace Backend.Application.Services.JWT
{
    public class JwtService : IJwtService
    {
        private readonly string _jwtSecret;
        private readonly ITokenBlacklistService _tokenBlacklistService;
        private readonly ILogger<JwtService> _logger;
        private readonly IEnvironmentService _environmentService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public JwtService(
            ITokenBlacklistService tokenBlackListSerivce,
            ILogger<JwtService> logger,
            JwtSettings jwtSettings,
            IEnvironmentService environmentService,
            IHttpContextAccessor httpContextAccessor)
        {
            _jwtSecret = jwtSettings.SecretKey; 
            _tokenBlacklistService = tokenBlackListSerivce;
            _logger = logger;
            _environmentService = environmentService;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<LoginResultDto> GenerateJWTTokenAsync(string persoid, string email)
        {
            var token = GenerateJwtToken(persoid, email);
            var environment = _environmentService.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
            _logger.LogInformation("Resolved environment: {Environment}", environment);
            var isSecure = environment.ToLower() == "production";

            _httpContextAccessor.HttpContext.Response.Cookies.Append("auth_token", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = isSecure,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddHours(1)
            });

            _logger.LogInformation("Cookie auth_token appended with token: {Token}", token);
            _logger.LogInformation("Auth token cookie set: {Token}", token);

            return new LoginResultDto { Success = true, Message = "Login successful", UserName = email, AccessToken = token };
        }

        private string GenerateJwtToken(string userId, string email, Dictionary<string, string>? additionalClaims = null)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Define claims
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId), // Subject (user ID)
                new Claim(JwtRegisteredClaimNames.Email, email), // Email
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Unique ID for each token
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64) // Issued at
            };

            // Add additional claims if provided
            if (additionalClaims != null)
            {
                foreach (var claim in additionalClaims)
                {
                    claims.Add(new Claim(claim.Key, claim.Value));
                }
            }

            var token = new JwtSecurityToken(
                issuer: "eBudget",
                audience: "eBudget",
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15), // Token expiration
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task BlacklistJwtTokenAsync(ClaimsPrincipal user)
        {
            var jti = user.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
            var expUnix = user.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;

            if (!string.IsNullOrEmpty(jti) && long.TryParse(expUnix, out var expUnixLong))
            {
                var expiration = DateTimeOffset.FromUnixTimeSeconds(expUnixLong).UtcDateTime;
                await _tokenBlacklistService.BlacklistTokenAsync(jti, expiration);
                _logger.LogInformation($"Token with jti {jti} has been blacklisted.");
            }
            else
            {
                _logger.LogWarning("jti or exp claim not found or invalid. Token cannot be blacklisted.");
            }
        }
        public ClaimsPrincipal? ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            try
            {
                // Validate token parameters
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret)),
                    ValidateIssuer = true,
                    ValidIssuer = "eBudget",
                    ValidateAudience = true,
                    ValidAudience = "eBudget",
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero, // Strict expiration validation
                    
                    RequireExpirationTime = true,
                    RequireSignedTokens = true,
                    
                };

                // Validate and return principal
                var principal = tokenHandler.ValidateToken(token, validationParameters, out _);

                // Additional blacklist check
                var jti = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
                if (!string.IsNullOrEmpty(jti) && _tokenBlacklistService.IsTokenBlacklistedAsync(jti).Result)
                {
                    _logger.LogWarning("Token {Jti} is blacklisted", jti);
                    return null;
                }

                return principal;
            }
            catch (SecurityTokenExpiredException)
            {
                _logger.LogWarning("Expired token: {Token}", token);
                return null;
            }
            catch (SecurityTokenInvalidSignatureException)
            {
                _logger.LogWarning("Invalid token signature: {Token}", token);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token validation failed");
                return null;
            }
        }
    }
}
