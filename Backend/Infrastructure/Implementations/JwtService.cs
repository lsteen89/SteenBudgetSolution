using Backend.Application.DTO.Auth;
using Backend.Application.Interfaces.JWT;
using Backend.Application.Mappers;
using Backend.Application.Models.Token;
using Backend.Application.Settings;
using Backend.Common.Interfaces;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.UserQueries;
using Backend.Infrastructure.Security;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Linq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Infrastructure.Implementations
{
    public class JwtService : IJwtService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly IUserSQLProvider _userSQLProvider;
        private readonly ITokenBlacklistService _tokenBlacklistService;
        private readonly IRefreshTokenSqlExecutor _refreshTokenSqlExecutor;
        private readonly ILogger<JwtService> _logger;
        private readonly IEnvironmentService _environmentService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ITimeProvider _timeProvider;

        public JwtService(
            JwtSettings jwtSettings,
            IUserSQLProvider userSQLProvider,
            ITokenBlacklistService tokenBlackListSerivce,
            IRefreshTokenSqlExecutor refreshTokenRepository,
            ILogger<JwtService> logger,
            IEnvironmentService environmentService,
            IHttpContextAccessor httpContextAccessor,
            ITimeProvider timeProvider)
        {
            _jwtSettings = jwtSettings;
            _userSQLProvider = userSQLProvider;
            _tokenBlacklistService = tokenBlackListSerivce;
            _refreshTokenSqlExecutor = refreshTokenRepository;
            _logger = logger;
            _environmentService = environmentService;
            _httpContextAccessor = httpContextAccessor;
            _timeProvider = timeProvider;
        }

        // GenerateJWTTokenAsync method, without rotating the token
        // This method does not rotate the token by default and accepts a JwtTokenModel, which is a generic model for the token
        public async Task<LoginResultDto> GenerateJWTTokenAsync(JwtTokenModel jwtTokenModel, ClaimsPrincipal? user = null)
        {
            var (newAccessToken, newRefreshToken, sessionId, newTokensSuccess) = await CreateAndStoreNewTokensAsync(jwtTokenModel);
            if (!newTokensSuccess)
            {
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }

            return new LoginResultDto { Success = true, Message = "Login successful", UserName = jwtTokenModel.Email, AccessToken = newAccessToken, RefreshToken = newRefreshToken, SessionId = sessionId };
        }

        // Overload for the GenerateJWTTokenAsync method
        // This method rotates the token and accepts a JwtRefreshTokenModel
        // Also renews the access token 
        public async Task<LoginResultDto> GenerateJWTTokenAsync(JwtRefreshTokenModel jwtRefreshTokenModel, ClaimsPrincipal? user = null)
        {
            // Step 1: Retrieve user details
            var dbUser = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(persoid: jwtRefreshTokenModel.Persoid);
            if (dbUser?.Email == null)
            {
                return new LoginResultDto { Success = false, Message = "User not found." };
            }

            // Step 2: Create a new JwtTokenModel for generating a new access token
            JwtTokenModel jwtTokenModel = Backend.Application.Helpers.Jwt.TokenHelper.CreateTokenModel(
                dbUser.PersoId,
                dbUser.Email,
                jwtRefreshTokenModel.DeviceId,
                jwtRefreshTokenModel.UserAgent
            );

            // Step 3: Retrieve the old refresh token record's data, then delete it.
            bool deleteSuccess = await _userSQLProvider.RefreshTokenSqlExecutor.DeleteTokenAsync(jwtRefreshTokenModel.RefreshToken);
            if (!deleteSuccess)
            {
                _logger.LogWarning("Error deleting refresh token for user {Email}", dbUser.Email);
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }

            // Step 4: Blacklist the old access token using the stored JTI from the refresh token record.
            bool blacklistSuccess = await BlacklistTokenByJtiAsync(jwtRefreshTokenModel.AccessTokenJti, jwtRefreshTokenModel.AccessTokenExpiryDate);
            if (!blacklistSuccess)
            {
                _logger.LogWarning("Error blacklisting old access token for user {Email}", dbUser.Email);
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }

            // Step 5: Generate new tokens and store them using our shared helper
            var (newAccessToken, newRefreshToken, newSessionId, newTokensSuccess) = await CreateAndStoreNewTokensAsync(jwtTokenModel);
            if (!newTokensSuccess)
            {
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }

            return new LoginResultDto
            {
                Success = true,
                Message = "Token refreshed successfully",
                UserName = dbUser.Email,
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                SessionId = newSessionId
            };
        }

        private string GenerateJwtToken(JwtTokenModel jwtTokenModel, Dictionary<string, string>? additionalClaims = null)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey))
            {
                KeyId = "access-token-key-v1"
            };

            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Define claims
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, jwtTokenModel.Persoid.ToString()), // Subject (user ID)
                new Claim(JwtRegisteredClaimNames.Email, jwtTokenModel.Email), // Email
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Unique ID for each token
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64), // Issued at
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
        public async Task<bool> BlacklistTokenByJtiAsync(string jti, DateTime accessTokenExpiryDate)
        {
            if (string.IsNullOrEmpty(jti))
            {
                _logger.LogWarning("BlacklistTokenByJtiAsync: JTI is null or empty.");
                return false;
            }
            try
            {
                bool success = await _tokenBlacklistService.BlacklistTokenByJtiAsync(jti, accessTokenExpiryDate);
                if (!success)
                {
                    _logger.LogWarning($"Token {jti} could not be inserted into the blacklist.");
                    return false;
                }
                _logger.LogInformation($"Token with JTI {jti} has been blacklisted until {accessTokenExpiryDate}.");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while blacklisting token by JTI.");
                return false;
            }
        }
        public ClaimsPrincipal? ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            try
            {
                // Construct the key with the same KeyId as in token generation
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey))
                {
                    KeyId = "access-token-key-v1"
                };

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateIssuer = true,
                    ValidIssuer = _jwtSettings.Issuer, 
                    ValidateAudience = true,
                    ValidAudience = _jwtSettings.Audience, 
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero, 
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

        public ClaimsPrincipal? DecodeExpiredToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey)),
                    ValidateIssuer = true,
                    ValidIssuer = _jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = _jwtSettings.Audience,
                    ValidateLifetime = false, // We do NOT validate lifetime here, we just want to decode the token
                    ClockSkew = TimeSpan.Zero
                };

                // This will decode the token even if it's expired.
                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
                return principal;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error decoding expired token.");
                return null;
            }
        }
        private string GetJtiFromToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtToken = tokenHandler.ReadJwtToken(token);
                return jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting JTI from token.");
                return null;
            }
        }
        private DateTime? GetAccessTokenExpiryDate(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            if (!tokenHandler.CanReadToken(token))
            {
                _logger.LogWarning("Cannot read the token.");
                return null;
            }

            try
            {
                var jwtToken = tokenHandler.ReadJwtToken(token);
                // The "exp" claim is a Unix timestamp (in seconds).
                var expClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?.Value;
                if (!string.IsNullOrEmpty(expClaim) && long.TryParse(expClaim, out var expUnix))
                {
                    return DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting access token expiry date.");
            }
            return null;
        }
        private async Task<(string NewAccessToken, string PlainRefreshToken, string sessionId, bool Success)> CreateAndStoreNewTokensAsync(JwtTokenModel jwtTokenModel)
        {
            // Generate the new access token
            var newAccessToken = GenerateJwtToken(jwtTokenModel);
            _logger.LogInformation($"Generated new JWT token for user {jwtTokenModel.Email}");

            // Extract the new token's JTI
            string newJti = GetJtiFromToken(newAccessToken);
            if (string.IsNullOrEmpty(newJti))
            {
                _logger.LogError("Failed to extract JTI from the new access token.");
                return (null, null, null, false);
            }
            // Get the access token expiry date
            var accessTokenExpiryDate = GetAccessTokenExpiryDate(newAccessToken);
            if (!accessTokenExpiryDate.HasValue)
            {
                _logger.LogError("Failed to extract access token expiry date.");
                return (null, null, null, false);
            }

            // Generate a new session ID for this login session
            var sessionId = Guid.NewGuid().ToString();

            // Generate a new refresh token
            var plainRefreshToken = TokenGenerator.GenerateRefreshToken();
            var hashedRefreshToken = TokenGenerator.HashToken(plainRefreshToken);
            DateTime refreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays);

            // Map to entity model and store the new refresh token in the database
            var newRefreshTokenModel = new JwtRefreshTokenModel
            {
                Persoid = jwtTokenModel.Persoid,
                SessionId = sessionId,
                RefreshToken = hashedRefreshToken,
                AccessTokenJti = newJti,
                RefreshTokenExpiryDate = refreshTokenExpiry,
                AccessTokenExpiryDate = accessTokenExpiryDate.Value,
                DeviceId = jwtTokenModel.DeviceId,
                UserAgent = jwtTokenModel.UserAgent
            };

            var refreshTokenEntity = RefreshTokenMapper.MapToEntity(newRefreshTokenModel);
            bool insertSuccessful = await _refreshTokenSqlExecutor.AddRefreshTokenAsync(refreshTokenEntity);
            if (!insertSuccessful)
            {
                _logger.LogWarning("Error inserting new refresh token for user {Email}", jwtTokenModel.Email);
                return (null, null, null, false);
            }

            return (newAccessToken, plainRefreshToken, sessionId, true);
        }

    }
}
