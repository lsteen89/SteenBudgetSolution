using Backend.Application.Configuration;
using Microsoft.AspNetCore.Http;
using Xunit;


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


            var cookieService = new Backend.Infrastructure.Services.CookieService.CookieService(httpContextAccessor, jwtSettings);
            string accessToken = "test-access-token";
            string refreshToken = "test-refresh-token";

            // Act: Call the method using the mocked HttpResponse (set up in UnitTestBase).
            cookieService.SetAuthCookies(MockHttpContext.Object.Response, accessToken, refreshToken);

            // Assert: Verify cookies are set in our CookiesContainer.
            Assert.True(CookiesContainer.ContainsKey("AccessToken"), "AccessToken cookie should be set.");
            Assert.True(CookiesContainer.ContainsKey("RefreshToken"), "RefreshToken cookie should be set.");

            var accessCookie = CookiesContainer["AccessToken"];
            var refreshCookie = CookiesContainer["RefreshToken"];

            Assert.Equal(accessToken, accessCookie.Value);
            Assert.Equal(refreshToken, refreshCookie.Value);

            // Verify cookie options.
            Assert.True(accessCookie.Options.HttpOnly, "AccessToken should be HttpOnly.");
            Assert.True(refreshCookie.Options.HttpOnly, "RefreshToken should be HttpOnly.");
            Assert.True(accessCookie.Options.Secure, "AccessToken should be Secure.");
            Assert.True(refreshCookie.Options.Secure, "RefreshToken should be Secure.");
            Assert.Equal(SameSiteMode.Strict, accessCookie.Options.SameSite);
            Assert.Equal(SameSiteMode.Strict, refreshCookie.Options.SameSite);

            // Verify that expiration is correctly set (greater than now).
            Assert.NotNull(accessCookie.Options.Expires);
            Assert.NotNull(refreshCookie.Options.Expires);
            Assert.True(accessCookie.Options.Expires > DateTime.UtcNow, "AccessToken cookie expiration should be in the future.");
            Assert.True(refreshCookie.Options.Expires > DateTime.UtcNow, "RefreshToken cookie expiration should be in the future.");
        }
    }
}

