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

namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsLogout : IntegrationTestBase
    {
        [Fact]
        public async Task LogoutAsync_ValidUser_ClearsCookieBlacklistsTokenAndNotifiesWebSocket()
        {
            // Arrange - Create and confirm user
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

            // Act - Login first to get valid token
            var loginResult = await AuthService.LoginAsync(
                new UserLoginDto
                {
                    Email = "test@example.com",
                    Password = "Password123!",
                    CaptchaToken = "mock-captcha-token"
                },
                "127.0.0.1"
            );

            // Extract token from cookie container
            var authToken = CookieContainer["auth_token"].Value;

            // Build claims principal from token
            var principal = jwtService.ValidateToken(authToken);
            foreach (var claim in principal.Claims)
            {
                Console.WriteLine($"Claim Type: {claim.Type}, Value: {claim.Value}");
            }


            // **New Assertions: Verify 'sub' Claim Exists and Is Correct**
            var subClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
            Assert.NotNull(subClaim); // Ensure 'sub' claim exists
            Assert.Equal(registeredUser.PersoId.ToString(), subClaim.Value); // Ensure 'sub' claim is correct
            WebSocketManagerMock
    .Setup(x => x.SendMessageAsync(It.IsAny<string>(), It.IsAny<string>()))
    .Returns(Task.CompletedTask);

            var resolvedWebSocketManager = ServiceProvider.GetRequiredService<IWebSocketManager>();
            Assert.Equal(WebSocketManagerMock.Object, resolvedWebSocketManager);
            // Act - Logout
            await AuthService.LogoutAsync(principal);

            // Assert
            // 1. Cookie cleared
            Assert.False(CookieContainer.ContainsKey("auth_token"), "auth_token cookie should be deleted.");

            // 2. Token blacklisted
            var tokenId = principal.FindFirst("jti")?.Value;
            Assert.True(await TokenBlacklistService.IsTokenBlacklistedAsync(tokenId), "Token should be blacklisted.");

            // 3. WebSocket notification sent
            WebSocketManagerMock.Verify(
                x => x.SendMessageAsync(
                    registeredUser.PersoId.ToString(),
                    "LOGOUT"
                ),
                Times.Once,
                "A LOGOUT message should be sent via WebSocket."
            );
        }

        [Fact]
        public async Task LogoutAsync_MissingSubClaim_LogsWarning()
        {
            // Arrange - Create invalid principal
            var claims = new[]
            {
        new Claim("jti", "dummy-token-id"),
        new Claim(ClaimTypes.Email, "test@example.com")
    };
            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));

            // Act
            await AuthService.LogoutAsync(principal);

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
