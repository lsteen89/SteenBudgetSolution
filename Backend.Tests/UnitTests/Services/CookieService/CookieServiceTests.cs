using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using Backend.Application.Settings;
using Backend.Application.Interfaces.JWT;
using Backend.Common.Interfaces;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Implementations;
using Microsoft.Extensions.Logging;
using System.IdentityModel.Tokens.Jwt;
using Backend.Infrastructure.Entities;

namespace Backend.Tests.UnitTests.Services.CookieService
{
    public class CookieServiceTests : UnitTestBase
    {
        [Fact]
        public void SetAuthCookies_ShouldAppendCorrectCookiesToResponse()
        {
            // Arrange: Create dummy tokens and JWT settings.
            var jwtSettings = new JwtSettings
            {
                ExpiryMinutes = 5,
                RefreshTokenExpiryDays = 30
            };

            // Create a DefaultHttpContext and assign it to an HttpContextAccessor
            var defaultContext = new DefaultHttpContext();
            var httpContextAccessor = new HttpContextAccessor { HttpContext = defaultContext };
            // Create a mock IWebHostEnvironment that returns "Development"
            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(env => env.EnvironmentName).Returns("Development");

            var cookieService = new Backend.Infrastructure.Services.CookieService.CookieService(mockEnv.Object, httpContextAccessor, jwtSettings);
            string accessToken = "test-access-token";
            string refreshToken = "test-refresh-token";
            string sessionId = "test-session-id";

            // Act: Call the method using the mocked HttpResponse (set up in UnitTestBase).
            cookieService.SetAuthCookies(MockHttpContext.Object.Response, accessToken, refreshToken, sessionId);

            // Assert: Verify cookies are set in our CookiesContainer.
            Assert.True(CookiesContainer.ContainsKey("AccessToken"), "AccessToken cookie should be set.");
            Assert.True(CookiesContainer.ContainsKey("RefreshToken"), "RefreshToken cookie should be set.");
            Assert.True(CookiesContainer.ContainsKey("SessionId"), "SessionId cookie should be set.");

            var accessCookie = CookiesContainer["AccessToken"];
            var refreshCookie = CookiesContainer["RefreshToken"];
            var sessionCookie = CookiesContainer["SessionId"];

            Assert.Equal(accessToken, accessCookie.Value);
            Assert.Equal(refreshToken, refreshCookie.Value);
            Assert.Equal(sessionId, sessionCookie.Value);

            // Verify cookie options.
            Assert.True(accessCookie.Options.HttpOnly, "AccessToken should be HttpOnly.");
            Assert.True(refreshCookie.Options.HttpOnly, "RefreshToken should be HttpOnly.");
            Assert.True(sessionCookie.Options.HttpOnly, "SessionId should be HttpOnly.");

            Assert.True(accessCookie.Options.Secure, "AccessToken should be Secure.");
            Assert.True(refreshCookie.Options.Secure, "RefreshToken should be Secure.");
            Assert.True(sessionCookie.Options.Secure, "SessionId should be Secure.");

            Assert.Equal(SameSiteMode.Lax, accessCookie.Options.SameSite);
            Assert.Equal(SameSiteMode.Lax, refreshCookie.Options.SameSite);
            Assert.Equal(SameSiteMode.Lax, sessionCookie.Options.SameSite);

            // Verify that expiration is correctly set (greater than now).
            Assert.NotNull(accessCookie.Options.Expires);
            Assert.NotNull(refreshCookie.Options.Expires);
            Assert.NotNull(sessionCookie.Options.Expires);

            Assert.True(accessCookie.Options.Expires > DateTime.UtcNow, "AccessToken cookie expiration should be in the future.");
            Assert.True(refreshCookie.Options.Expires > DateTime.UtcNow, "RefreshToken cookie expiration should be in the future.");
            Assert.True(sessionCookie.Options.Expires > DateTime.UtcNow, "SessionId cookie expiration should be in the future.");
        }
        [Fact]
        public async Task GenerateJWTTokenAsync_ShouldEmbedFirstLoginClaim()
        {
            // Arrange
            var jwtSettings = new JwtSettings
            {
                ExpiryMinutes = 5,
                RefreshTokenExpiryDays = 30,
                SecretKey = "supersecretkey_supersecretkey_supersecretkey", // must be long enough
                Issuer = "TestIssuer",
                Audience = "TestAudience"
            };

            // Create necessary mocks.
            var userSQLProviderMock = new Mock<IUserSQLProvider>();
            var tokenBlacklistServiceMock = new Mock<ITokenBlacklistService>();
            var refreshTokenSqlExecutorMock = new Mock<IRefreshTokenSqlExecutor>();
            var loggerMock = new Mock<ILogger<JwtService>>();
            var environmentServiceMock = new Mock<IEnvironmentService>();
            var httpContextAccessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
            var timeProviderMock = new Mock<ITimeProvider>();
            timeProviderMock.Setup(tp => tp.UtcNow).Returns(DateTime.UtcNow);

            // Setup refresh token insertion to succeed.
            refreshTokenSqlExecutorMock
                .Setup(x => x.AddRefreshTokenAsync(It.IsAny<Backend.Infrastructure.Entities.RefreshJwtTokenEntity>()))
                .ReturnsAsync(true);

            // Instantiate JwtService with mocked dependencies.
            var jwtService = new JwtService(
                jwtSettings,
                userSQLProviderMock.Object,
                tokenBlacklistServiceMock.Object,
                refreshTokenSqlExecutorMock.Object,
                loggerMock.Object,
                environmentServiceMock.Object,
                httpContextAccessor,
                timeProviderMock.Object
            );

            // Create a JwtTokenModel with FirstLogin = true.
            var jwtTokenModel = new JwtTokenModel
            {
                Persoid = Guid.NewGuid(),
                Email = "test@test.com",
                FirstLogin = true,
                DeviceId = "device-123",
                UserAgent = "UnitTestAgent"
            };

            // Act: Call the method to generate tokens.
            var loginResult = await jwtService.GenerateJWTTokenAsync(jwtTokenModel);

            // Assert: Ensure token generation was successful.
            Assert.True(loginResult.Success, "Token generation should be successful.");
            Assert.False(string.IsNullOrEmpty(loginResult.AccessToken), "Access token should not be empty.");

            // Decode the access token.
            var tokenHandler = new JwtSecurityTokenHandler();
            Assert.True(tokenHandler.CanReadToken(loginResult.AccessToken), "The generated JWT is not well-formed.");

            var jwtToken = tokenHandler.ReadJwtToken(loginResult.AccessToken);
            var firstLoginClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "first_login");

            // Validate the "first_login" claim.
            Assert.NotNull(firstLoginClaim);
            Assert.Equal("true", firstLoginClaim.Value.ToLower());
        }

    }
}

