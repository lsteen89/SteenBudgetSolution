using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using Backend.Settings;

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
    }
}

