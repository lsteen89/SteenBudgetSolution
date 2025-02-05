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

        public async Task<LoginResultDto> GenerateJWTTokenAsync(Guid persoid, string email, bool rotateToken = false, ClaimsPrincipal? user = null)
        {
            // Step 1: Generate the JWT token
            var token = GenerateJwtToken(persoid, email);
            _logger.LogInformation($"Generated JWT token for user {email}");

            // Step 2A: Generate the refresh token
            var refreshToken = TokenGenerator.GenerateRefreshToken();  
            var hashedRefreshToken = TokenGenerator.HashToken(refreshToken);
            // Calculate the expiry date for the refresh token
            DateTime refreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays);

            if (rotateToken)
            {
                // Step 2B: Blacklist the current token
                bool success = await BlacklistJwtTokenAsync(token);
                if (!success)
                {
                    return new LoginResultDto { Success = false, Message = "Internal error" };
                }
            }

            // Step 3: Store the refresh token in the database
            var insertSuccesful = await _refreshTokenSqlExecutor.AddRefreshTokenAsync(persoid, hashedRefreshToken, refreshTokenExpiry);
            if (!insertSuccesful)
            {
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }
            
            return new LoginResultDto { Success = true, Message = "Login successful", UserName = email, AccessToken = token, RefreshToken = refreshToken };
        }

        private string GenerateJwtToken(Guid persoid, string email, Dictionary<string, string>? additionalClaims = null)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Define claims
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, persoid.ToString()), // Subject (user ID)
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

        public async Task<bool> BlacklistJwtTokenAsync(string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("BlacklistJwtTokenAsync: Token is null or empty.");
                return false;
            }

            var tokenHandler = new JwtSecurityTokenHandler();

            try
            {
                var jwtToken = tokenHandler.ReadJwtToken(token);

                var jti = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;
                var expClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?.Value;

                if (string.IsNullOrEmpty(jti) || string.IsNullOrEmpty(expClaim) || !long.TryParse(expClaim, out var expUnixLong))
                {
                    _logger.LogWarning("BlacklistJwtTokenAsync: JTI or Exp claim is missing or invalid.");
                    return false;
                }

                var expiration = DateTimeOffset.FromUnixTimeSeconds(expUnixLong).UtcDateTime;
                bool blaclistSuccess = await _tokenBlacklistService.BlacklistTokenAsync(jti, expiration);
                if(!blaclistSuccess)
                {
                    _logger.LogWarning($"Token {jti} not inserted correctly into database.");
                    return false;
                }
                _logger.LogInformation($"Token with JTI {jti} has been blacklisted until {expiration}.");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while blacklisting JWT token.");
                return false;
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
