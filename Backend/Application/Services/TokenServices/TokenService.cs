using Backend.Domain.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Application.Services.TokenServices
{
    public class TokenService
    {
        private readonly string _jwtSecretKey;
        private readonly ILogger<TokenService> _logger;

        public TokenService(IConfiguration configuration, ILogger<TokenService> logger)
        {
            _jwtSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(_jwtSecretKey))
            {
                throw new InvalidOperationException("JWT secret key not configured in environment variables.");
            }
            _logger = logger;
        }

        public string GenerateJwtToken(UserModel user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSecretKey);
            if (key.Length < 16)
            {
                throw new InvalidOperationException("JWT secret key must be at least 16 characters long.");
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("id", user.Id.ToString()),
                    new Claim("email", user.Email ?? string.Empty)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            if (string.IsNullOrEmpty(user.Email))
            {
                _logger.LogWarning("User with ID {Id} does not have an email set.", user.Id);
            }

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
