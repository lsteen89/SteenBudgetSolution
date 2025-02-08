using Backend.Application.Configuration;
using Backend.Application.DTO;
using Backend.Application.Interfaces.JWT;
using Backend.Application.Mappers;
using Backend.Application.Models;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Interfaces;
using Backend.Infrastructure.Security;
using Microsoft.IdentityModel.Tokens;
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
            // Step 1: Generate the JWT token
            var token = GenerateJwtToken(jwtTokenModel);
            _logger.LogInformation($"Generated JWT token for user {jwtTokenModel.Email}");

            // Step 2: Generate a new refresh token
            var refreshToken = TokenGenerator.GenerateRefreshToken();  
            var hashedRefreshToken = TokenGenerator.HashToken(refreshToken);
            DateTime refreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays);

            // Step 3: Map to entity model and store the refresh token in the database
            var newRefreshTokenModel = new JwtRefreshTokenModel
            {
                Persoid = jwtTokenModel.Persoid,
                RefreshToken = hashedRefreshToken,
                ExpiryDate = refreshTokenExpiry,
                DeviceId = jwtTokenModel.DeviceId,
                UserAgent = jwtTokenModel.UserAgent
            };

            var refreshTokenEntity = RefreshTokenMapper.MapToEntity(newRefreshTokenModel);
            bool insertSuccessful = await _refreshTokenSqlExecutor.AddRefreshTokenAsync(refreshTokenEntity);
            if (!insertSuccessful)
            {
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }
            
            return new LoginResultDto { Success = true, Message = "Login successful", UserName = jwtTokenModel.Email, AccessToken = token, RefreshToken = refreshToken };
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

            // step 2: Create a new JwtTokenModel for generating a new access token
            JwtTokenModel jwtTokenModel = Backend.Application.Helpers.Jwt.TokenHelper.CreateTokenModel(
                dbUser.PersoId,
                dbUser.Email,
                jwtRefreshTokenModel.DeviceId,
                jwtRefreshTokenModel.UserAgent
            );


            // Step 3: Generate the JWT token
            var token = GenerateJwtToken(jwtTokenModel);
            _logger.LogInformation($"Generated JWT token for user {jwtTokenModel.Email}");

            // Step 4: Delete existing refreshtoken for user, delete it
            bool deleteSuccess = await _userSQLProvider.RefreshTokenSqlExecutor.DeleteTokenAsync(jwtRefreshTokenModel.RefreshToken);
            if(!deleteSuccess)
            {
                _logger.LogWarning("Error deleting refresh token for user {Email}", jwtTokenModel.Email);
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }

            // Step 4: Blacklist the old access token
            bool blackListsuccess = await BlacklistJwtTokenAsync(token);
            if (!blackListsuccess)
            {
                _logger.LogWarning("Error blacklisting accesstoken for user {Email}", jwtTokenModel.Email);
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }
            
            // Step 5: Generate a new refresh token
            var refreshToken = TokenGenerator.GenerateRefreshToken();
            var hashedRefreshToken = TokenGenerator.HashToken(refreshToken);
            DateTime refreshTokenExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays);

            // Step 6: Map to entity model and store the refresh token in the database
            var newRefreshTokenModel = new JwtRefreshTokenModel
            {
                Persoid = jwtTokenModel.Persoid,
                RefreshToken = hashedRefreshToken,
                ExpiryDate = refreshTokenExpiry,
                DeviceId = jwtTokenModel.DeviceId,
                UserAgent = jwtTokenModel.UserAgent
            };

            var refreshTokenEntity = RefreshTokenMapper.MapToEntity(newRefreshTokenModel);
            bool insertSuccessful = await _refreshTokenSqlExecutor.AddRefreshTokenAsync(refreshTokenEntity);
            if (!insertSuccessful)
            {
                _logger.LogWarning("Error inserting refresh token for user {Email}", jwtTokenModel.Email);
                return new LoginResultDto { Success = false, Message = "Internal error" };
            }

            return new LoginResultDto { Success = true, Message = "Token refreshed successfully", UserName = jwtTokenModel.Email, AccessToken = token, RefreshToken = refreshToken };
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

    }
}
