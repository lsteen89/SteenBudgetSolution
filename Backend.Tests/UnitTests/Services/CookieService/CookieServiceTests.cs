using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using Backend.Settings;
using System.Globalization;
using CookieSvc = Backend.Infrastructure.Services.CookieService.CookieService;

namespace Backend.Tests.UnitTests.Services.CookieService
{
    public class CookieServiceTests : UnitTestBase
    {
        [Fact]
        public void SetRefreshCookie_ShouldAppendCorrectCookieToResponse()
        {
            // Arrange
            var jwtSettings = new JwtSettings
            {
                // you're using RefreshTokenExpiryDaysAbsolute in BuildOptions
                RefreshTokenExpiryDaysAbsolute = 30
            };
            var defaultContext = new DefaultHttpContext();
            var httpContextAccessor = new HttpContextAccessor { HttpContext = defaultContext };

            var mockEnv = new Mock<IWebHostEnvironment>();
            mockEnv.Setup(env => env.EnvironmentName).Returns("Development");

            var cookieService = new CookieSvc(
                mockEnv.Object,
                httpContextAccessor,
                jwtSettings);

            string refreshToken = "test-refresh-token";

            // Act
            cookieService.SetRefreshCookie(defaultContext.Response, refreshToken);

            // Grab the first Set-Cookie header
            var setCookie = defaultContext.Response.Headers["Set-Cookie"].FirstOrDefault();
            Assert.NotNull(setCookie);

            // 1) Name & value
            Assert.Contains("RefreshToken=test-refresh-token", setCookie);

            // 2) Flags
            Assert.Contains("HttpOnly", setCookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Secure", setCookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("SameSite=Strict", setCookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Path=/", setCookie, StringComparison.OrdinalIgnoreCase);


            // 3) Development ⇒ no Domain
            Assert.DoesNotContain("Domain=", setCookie);

            // 4) Expires check
            //    e.g. …; Expires=Wed, 20 Jun 2025 15:04:05 GMT; …
            var expiresPart = setCookie
                .Split(';')
                .Select(p => p.Trim())
                .FirstOrDefault(p => p.StartsWith("Expires=", StringComparison.OrdinalIgnoreCase));

            Assert.NotNull(expiresPart);

            // parse with invariant culture
            var token = expiresPart!["Expires=".Length..];
            DateTime expiresUtc = DateTime.ParseExact(
                token,
                "ddd, dd MMM yyyy HH:mm:ss 'GMT'",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);

            Assert.True(expiresUtc > DateTime.UtcNow, "Cookie Expires should be in the future");
        }
    }
}

