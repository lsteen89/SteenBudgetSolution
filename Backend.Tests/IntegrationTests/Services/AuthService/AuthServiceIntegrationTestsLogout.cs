using Backend.Application.DTO;
using Backend.Application.Services.AuthService;
using Backend.Domain.Entities;
using Backend.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;
using System.IdentityModel.Tokens.Jwt;
using Backend.Application.Interfaces.JWT;

namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsLogout : IntegrationTestBase
    {
        [Fact]
        public async Task LogoutAsync_ValidUser_BlacklistsTokenAndNotifiesWebSocket()
        {
            // **Arrange** - Create and confirm user
            var userCreationDto = new UserCreationDto
            {
                FirstName = "Test",
                LastName = "User",
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };

            var registeredUser = await SetupUserAsync(userCreationDto);
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // **Act** - Login to obtain JWT token
            var loginResult = await AuthService.LoginAsync(
                new UserLoginDto
                {
                    Email = "test@example.com",
                    Password = "Password123!",
                    CaptchaToken = "mock-captcha-token"
                },
                "127.0.0.1"
            );

            var authToken = loginResult.AccessToken;
            Assert.False(string.IsNullOrEmpty(authToken), "Access token should not be null or empty.");

            // **Validate Token Before Logout**
            var principal = jwtService.ValidateToken(authToken);
            Assert.NotNull(principal);
            Assert.True(principal.Identity.IsAuthenticated, "Principal should be authenticated.");

            // Extract Claims
            var jtiClaim = principal.FindFirst(JwtRegisteredClaimNames.Jti);
            Assert.NotNull(jtiClaim);

            var subClaim = principal.FindFirst(JwtRegisteredClaimNames.Sub)
                           ?? principal.FindFirst(ClaimTypes.NameIdentifier); // Fallback
            Assert.NotNull(subClaim);
            Assert.Equal(registeredUser.PersoId.ToString(), subClaim.Value);

            var expClaim = principal.FindFirst(JwtRegisteredClaimNames.Exp);
            Assert.NotNull(expClaim);

            var expUnix = long.Parse(expClaim.Value);
            var expiration = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;

            // **Mock WebSocketManager to expect a LOGOUT message**
            WebSocketManagerMock
                .Setup(x => x.SendMessageAsync(registeredUser.PersoId.ToString(), "LOGOUT"))
                .Returns(Task.CompletedTask)
                .Verifiable();

            // **Act** - Call LogoutAsync
            await AuthService.LogoutAsync(principal, authToken);

            // **Assert** - Token should be blacklisted
            var isBlacklisted = await TokenBlacklistService.IsTokenBlacklistedAsync(jtiClaim.Value);
            Assert.True(isBlacklisted, "Token should be blacklisted after logout.");

            // **Assert** - WebSocket should be notified
            WebSocketManagerMock.Verify(
                x => x.SendMessageAsync(registeredUser.PersoId.ToString(), "LOGOUT"),
                Times.Once,
                "A 'LOGOUT' message should be sent via WebSocket."
            );

            // **Assert** - Token should be invalid after logout
            var postLogoutPrincipal = jwtService.ValidateToken(authToken);
            Assert.True(postLogoutPrincipal == null, "Token should be invalid after logout.");
        }




        [Fact]
        public async Task LogoutAsync_MissingSubClaim_LogsWarning()
        {
            // **Arrange** - Create and confirm user
            var userCreationDto = new UserCreationDto
            {
                FirstName = "Test",
                LastName = "User",
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };

            var registeredUser = await SetupUserAsync(userCreationDto);
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // **Act** - Login to obtain JWT token
            var loginResult = await AuthService.LoginAsync(
                new UserLoginDto
                {
                    Email = "test@example.com",
                    Password = "Password123!",
                    CaptchaToken = "mock-captcha-token"
                },
                "127.0.0.1"
            );

            var authToken = loginResult.AccessToken;
            Assert.False(string.IsNullOrEmpty(authToken), "Access token should not be null or empty.");

            // Arrange - Create invalid principal
            var claims = new[]
            {
                new Claim("jti", "dummy-token-id"),
                new Claim(ClaimTypes.Email, "test@example.com")
            };
            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

            // Act
            await AuthService.LogoutAsync(principal, authToken);

            // Assert
            // Verify WebSocket wasn't called
            WebSocketManagerMock.Verify(
                x => x.SendMessageAsync(It.IsAny<string>(), It.IsAny<string>()),
                Times.Never
            );

            // Verify warning log
            var logger = ServiceProvider.GetRequiredService<ILogger<Backend.Application.Services.AuthService.AuthService>>()
                         as TestLogger<Backend.Application.Services.AuthService.AuthService>;
            Assert.NotNull(logger); // Ensure cast worked
            Assert.Contains(logger.Logs, log => log.Contains("User ID not found in claims"));

        }

    }
}
