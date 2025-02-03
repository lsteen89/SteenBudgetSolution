using Backend.Application.DTO;
using Backend.Application.Interfaces.JWT;
using Backend.Infrastructure.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Application.Configuration;
using Backend.Infrastructure.Security;
using Backend.Infrastructure.Data.Sql.Interfaces;

namespace Backend.Infrastructure.Implementations
{
    public class JwtService : IJwtService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly ITokenBlacklistService _tokenBlacklistService;
        private readonly IRefreshTokenSqlExecutor _refreshTokenSqlExecutor;
        private readonly ILogger<JwtService> _logger;
        private readonly IEnvironmentService _environmentService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ITimeProvider _timeProvider;

        public JwtService(
            ITokenBlacklistService tokenBlackListSerivce,
            IRefreshTokenSqlExecutor refreshTokenRepository,
            ILogger<JwtService> logger,
            JwtSettings jwtSettings,
            IEnvironmentService environmentService,
            IHttpContextAccessor httpContextAccessor,
            ITimeProvider timeProvider)
        {
            _jwtSettings = jwtSettings;
            _tokenBlacklistService = tokenBlackListSerivce;
            _refreshTokenSqlExecutor = refreshTokenRepository;
            _logger = logger;
            _environmentService = environmentService;
            _httpContextAccessor = httpContextAccessor;
            _timeProvider = timeProvider;
        }

        public async Task<LoginResultDto> GenerateJWTTokenAsync(string persoid, string email)
        {
            // Step 1: Generate the JWT token
            var token = GenerateJwtToken(persoid, email);
            
            // Step 2: Generate the refresh token
            var refreshToken = TokenGenerator.GenerateRefreshToken();  
            var hashedRefreshToken = TokenGenerator.HashToken(refreshToken);
            // Calculate the expiry date for the refresh token
            DateTime refreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays);

            // Step 3: Store the refresh token in the database
            var insertSuccesful = await _refreshTokenSqlExecutor.AddRefreshTokenAsync(persoid, hashedRefreshToken, refreshTokenExpiry);
            if(!insertSuccesful)
            {
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }

            return new LoginResultDto { Success = true, Message = "Login successful", UserName = email, AccessToken = token, RefreshToken = refreshToken };
        }

        private string GenerateJwtToken(string userId, string email, Dictionary<string, string>? additionalClaims = null)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
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
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
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
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey)),
                    ValidateIssuer = true,
                    ValidIssuer = "eBudget",
                    ValidateAudience = true,
                    ValidAudience = "eBudget",
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero, // Strict expiration validation
                    LifetimeValidator = (notBefore, expires, securityToken, validationParameters) =>
                    {
                        var currentTime = _timeProvider.UtcNow;
                        _logger.LogInformation($"Validating token lifetime: Current time: {currentTime}, Token expires at: {expires}");

                        return expires > currentTime;
                    },
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
