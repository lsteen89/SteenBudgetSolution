using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Backend.Infrastructure.Interfaces;

namespace Backend.Infrastructure.Security;
public class TokenService : ITokenService
{
    private readonly string _jwtSecret;

    public TokenService(IConfiguration configuration)
    {
        _jwtSecret = configuration["JWT_SECRET_KEY"]; // Fetch from environment variables
    }

    public string GenerateJwtToken(string userId, string email, Dictionary<string, string>? additionalClaims = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Basic claims
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

}
