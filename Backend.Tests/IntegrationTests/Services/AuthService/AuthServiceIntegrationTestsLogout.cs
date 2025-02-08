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
using Backend.Infrastructure.Security;
using Backend.Tests.Helpers;

namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsLogout : IntegrationTestBase
    {
        [Fact]
        public async Task LogoutAsync_ValidUser_BlacklistsTokenAndNotifiesWebSocket()
        {
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
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
                }
                , ipAddress, deviceId, userAgent
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

            // retrieve refresh token
            // Fetch refresh token
            var providedHashedToken = TokenGenerator.HashToken(loginResult.RefreshToken);
            var storedTokens = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(refreshToken: providedHashedToken);
            var storedToken = storedTokens.FirstOrDefault();

            // **Act** - Call LogoutAsync
            await AuthService.LogoutAsync(principal, authToken, storedToken.RefreshToken, logoutAll : false);

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
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();

            // **Act** - Login to obtain JWT token
            var loginResult = await AuthService.LoginAsync(
                new UserLoginDto
                {
                    Email = "test@example.com",
                    Password = "Password123!",
                    CaptchaToken = "mock-captcha-token"
                },
                ipAddress, deviceId, userAgent
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

            // Fetch refresh token
            var providedHashedToken = TokenGenerator.HashToken(loginResult.RefreshToken);
            var storedTokens = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(refreshToken: providedHashedToken);
            var storedToken = storedTokens.FirstOrDefault();

            // Act
            await AuthService.LogoutAsync(principal, authToken, storedToken.RefreshToken, logoutAll: false);

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
        [Fact]
        public async Task LoginFromThreeDevices_LogoutBehavior_Test()
        {
            // Arrange: Setup metadata for three different devices.
            var (ipAddress, deviceId1, userAgent1) = AuthTestHelper.GetDefaultMetadata();
            var deviceId2 = "test-device-2";
            var userAgent2 = "Mozilla/5.0 (compatible; TestBrowser/2.0)";
            var deviceId3 = "test-device-3";
            var userAgent3 = "Mozilla/5.0 (compatible; TestBrowser/3.0)";

            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            // Create and confirm the user.
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act: Log in from three different devices.
            var result1 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId1, userAgent1);
            var result2 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId2, userAgent2);
            var result3 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId3, userAgent3);

            Assert.True(result1.Success, "First login should succeed.");
            Assert.True(result2.Success, "Second login should succeed.");
            Assert.True(result3.Success, "Third login should succeed.");

            // Assert: There should be three refresh token records.
            var tokensBeforeLogout = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);
            Assert.Equal(3, tokensBeforeLogout.Count());

            // Validate tokens to obtain ClaimsPrincipals for each session.
            var principal1 = jwtService.ValidateToken(result1.AccessToken);
            var principal2 = jwtService.ValidateToken(result2.AccessToken);
            var principal3 = jwtService.ValidateToken(result3.AccessToken);

            Assert.NotNull(principal1);
            Assert.True(principal1.Identity.IsAuthenticated);
            Assert.NotNull(principal2);
            Assert.True(principal2.Identity.IsAuthenticated);
            Assert.NotNull(principal3);
            Assert.True(principal3.Identity.IsAuthenticated);

            // **Step 1: Single Logout (logoutAll = false) for session 1.**
            await AuthService.LogoutAsync(principal1, result1.AccessToken, result1.RefreshToken, logoutAll: false);

            // After logging out session 1, expect 2 refresh tokens remain.
            var tokensAfterSingleLogout = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);
            Assert.Equal(2, tokensAfterSingleLogout.Count());

            // **Step 2: Global Logout (logoutAll = true) from one of the remaining sessions (e.g., session 2).**
            await AuthService.LogoutAsync(principal2, result2.AccessToken, result2.RefreshToken, logoutAll: true);

            // After global logout, expect no refresh tokens remain.
            var tokensAfterGlobalLogout = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);
            Assert.Empty(tokensAfterGlobalLogout);

            // Optionally, verify WebSocketManager was called for each logout.
            WebSocketManagerMock.Verify(
                x => x.SendMessageAsync(registeredUser.PersoId.ToString(), "LOGOUT"),
                Times.Exactly(2)); 
        }
        [Fact]
        public async Task Logout_SingleAndGlobalLogout_ShouldManageRefreshTokensProperly()
        {
            // Arrange: Setup metadata for three devices.
            var (ipAddress, deviceId1, userAgent1) = AuthTestHelper.GetDefaultMetadata();
            var deviceId2 = "test-device-2";
            var userAgent2 = "Mozilla/5.0 (compatible; TestBrowser/2.0)";
            var deviceId3 = "test-device-3";
            var userAgent3 = "Mozilla/5.0 (compatible; TestBrowser/3.0)";

            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            // Set up and confirm the user.
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act: Log in from three different devices.
            var result1 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId1, userAgent1);
            var result2 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId2, userAgent2);
            var result3 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId3, userAgent3);
            Assert.True(result1.Success);
            Assert.True(result2.Success);
            Assert.True(result3.Success);

            // Assert: Verify three refresh token records exist.
            var tokensBeforeLogout = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);
            Assert.Equal(3, tokensBeforeLogout.Count());

            // Act: Log out only from session 1 (logoutAll = false)
            var principal1 = jwtService.ValidateToken(result1.AccessToken);
            await AuthService.LogoutAsync(principal1, result1.AccessToken, result1.RefreshToken, logoutAll: false);
            var tokensAfterSingleLogout = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);
            Assert.Equal(2, tokensAfterSingleLogout.Count());  // Only session 1's token should be removed

            // Act: Log out globally from one remaining session (logoutAll = true)
            var principal2 = jwtService.ValidateToken(result2.AccessToken);
            await AuthService.LogoutAsync(principal2, result2.AccessToken, result2.RefreshToken, logoutAll: true);
            var tokensAfterGlobalLogout = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);
            Assert.Empty(tokensAfterGlobalLogout);  // All tokens should be removed

        }


    }
}
