using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using Backend.Application.Abstractions.Infrastructure.Auth;
using Backend.Infrastructure.Auth;
using Backend.Settings;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Backend.IntegrationTests.Auth;

public class JwtLifetimeTests
{
    private readonly JwtSettings _jwtSettings;
    private readonly IJwtKeyRing _keyRing;

    public JwtLifetimeTests()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string>
            {
                {"Jwt:Issuer", "eBudget"},
                {"Jwt:Audience", "eBudget"},
                {"Jwt:ActiveKid", "test-key"},
                {"Jwt:Keys:test-key", "dGVzdC1rZXktdGhhdC1pcy1sb25nLWVub3VnaC1mb3ItaHMyNTY="}, // base64 encoded "test-key-that-is-long-enough-for-hs256"
                {"Jwt:ExpiryMinutes", "15"}
            }!)
            .Build();

        _jwtSettings = configuration.GetSection("Jwt").Get<JwtSettings>()!;
        _keyRing = new HsKeyRing(configuration);
    }

    private string GenerateToken(DateTime issuedAt, DateTime expiresAt)
    {
        var key = _keyRing.ActiveKey;
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            }),
            IssuedAt = issuedAt,
            NotBefore = issuedAt,
            Expires = expiresAt,
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        };
        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    [Fact]
    public void ExpiredToken_Returns401()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var expiredToken = GenerateToken(now.AddMinutes(-30), now.AddMinutes(-15));
        var tokenHandler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = _jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = _keyRing.ActiveKey,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // Act
        Action act = () => tokenHandler.ValidateToken(expiredToken, validationParameters, out _);

        // Assert
        act.Should().Throw<SecurityTokenExpiredException>();
    }

    [Fact]
    public void WithinClockSkew_AcceptsToken()
    {
        // Arrange
        var now = DateTime.UtcNow;
        // Token expired 15 seconds ago, but clock skew is 30 seconds
        var token = GenerateToken(now.AddSeconds(-45), now.AddSeconds(-15));
        var tokenHandler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = _jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = _keyRing.ActiveKey,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // Act
        var principal = tokenHandler.ValidateToken(token, validationParameters, out _);

        // Assert
        principal.Should().NotBeNull();
    }

    [Fact]
    public void OutsideClockSkew_RejectsToken()
    {
        // Arrange
        var now = DateTime.UtcNow;
        // Token expired 45 seconds ago, and clock skew is 30 seconds
        var token = GenerateToken(now.AddSeconds(-75), now.AddSeconds(-45));
        var tokenHandler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = _jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = _keyRing.ActiveKey,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // Act
        Action act = () => tokenHandler.ValidateToken(token, validationParameters, out _);

        // Assert
        act.Should().Throw<SecurityTokenExpiredException>();
    }
}
