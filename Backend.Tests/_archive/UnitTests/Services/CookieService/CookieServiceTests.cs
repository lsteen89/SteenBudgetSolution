using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using Backend.Settings;
using System.Globalization;
using CookieSvc = Backend.Infrastructure.Services.CookieService.CookieService;
using Microsoft.Extensions.Hosting;

namespace Backend.Tests.UnitTests.Services.CookieService
{
    public class CookieServiceTests
    {
        private readonly JwtSettings _jwtSettings;
        private readonly Mock<IWebHostEnvironment> _mockEnv;
        private readonly HttpContextAccessor _httpContextAccessor;

        public CookieServiceTests()
        {
            _jwtSettings = new JwtSettings
            {
                RefreshTokenExpiryDaysAbsolute = 30 // Consistent with your CookieService logic
            };

            _mockEnv = new Mock<IWebHostEnvironment>();
            // Default to Development for most tests, can be overridden if needed
            _mockEnv.Setup(env => env.EnvironmentName).Returns(Environments.Development); // Using Environments.Development for type safety

            // HttpContextAccessor needs to be set up for each test with a new DefaultHttpContext
            // if the Response.Headers are modified and checked.
            _httpContextAccessor = new HttpContextAccessor();
        }

        private CookieSvc CreateCookieService(DefaultHttpContext context)
        {
            // Ensure the HttpContextAccessor has the context for *this* test run
            _httpContextAccessor.HttpContext = context;
            return new CookieSvc(
                _mockEnv.Object,
                _httpContextAccessor,
                _jwtSettings);
        }

        [Fact]
        public void SetRefreshCookie_WhenRememberMeIsFalse_ShouldSetSessionCookie()
        {
            // Arrange
            var defaultContext = new DefaultHttpContext(); // Fresh context for each test
            var cookieService = CreateCookieService(defaultContext);
            string refreshToken = "session-refresh-token";
            bool rememberMe = false;

            // Act
            cookieService.SetRefreshCookie(defaultContext.Response, refreshToken, rememberMe);

            // Assert
            var setCookieHeader = defaultContext.Response.Headers["Set-Cookie"].FirstOrDefault();
            Assert.NotNull(setCookieHeader);

            // 1) Name & value
            Assert.Contains($"RefreshToken={refreshToken}", setCookieHeader);

            // 2) Common Flags
            Assert.Contains("HttpOnly", setCookieHeader, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Secure", setCookieHeader, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("SameSite=Strict", setCookieHeader, StringComparison.OrdinalIgnoreCase); // Based on your BuildOptions
            Assert.Contains("Path=/", setCookieHeader, StringComparison.OrdinalIgnoreCase);       // Based on your BuildOptions

            // 3) Development environment should not have Domain attribute (as per your BuildOptions logic)
            Assert.DoesNotContain("Domain=", setCookieHeader, StringComparison.OrdinalIgnoreCase);

            // 4) Expires attribute should NOT be present for a session cookie
            var expiresPart = setCookieHeader
                .Split(';')
                .Select(p => p.Trim())
                .FirstOrDefault(p => p.StartsWith("Expires=", StringComparison.OrdinalIgnoreCase));

            Assert.Null(expiresPart); // << KEY CHANGE: Expires should be null for session cookies
        }

        [Fact]
        public void SetRefreshCookie_WhenRememberMeIsTrue_ShouldSetPersistentCookieWithExpiry()
        {
            // Arrange
            var defaultContext = new DefaultHttpContext(); // Fresh context for each test
            var cookieService = CreateCookieService(defaultContext);
            string refreshToken = "persistent-refresh-token";
            bool rememberMe = true;
            var expectedMinExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDaysAbsolute).AddMinutes(-1); // Allow for slight clock skew/test execution time
            var expectedMaxExpiry = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDaysAbsolute).AddMinutes(1);

            // Act
            cookieService.SetRefreshCookie(defaultContext.Response, refreshToken, rememberMe);

            // Assert
            var setCookieHeader = defaultContext.Response.Headers["Set-Cookie"].FirstOrDefault();
            Assert.NotNull(setCookieHeader);

            // 1) Name & value
            Assert.Contains($"RefreshToken={refreshToken}", setCookieHeader);

            // 2) Common Flags (repeated for completeness, can be refactored if many tests share this)
            Assert.Contains("HttpOnly", setCookieHeader, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Secure", setCookieHeader, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("SameSite=Strict", setCookieHeader, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Path=/", setCookieHeader, StringComparison.OrdinalIgnoreCase);

            // 3) Development environment should not have Domain attribute
            Assert.DoesNotContain("Domain=", setCookieHeader, StringComparison.OrdinalIgnoreCase);

            // 4) Expires attribute SHOULD be present and correct for a persistent cookie
            var expiresPart = setCookieHeader
                .Split(';')
                .Select(p => p.Trim())
                .FirstOrDefault(p => p.StartsWith("Expires=", StringComparison.OrdinalIgnoreCase));

            Assert.NotNull(expiresPart); // << Expires SHOULD exist

            var expiresValueString = expiresPart!["Expires=".Length..]; // Using ! because we asserted NotNull
            DateTime expiresUtc = DateTime.ParseExact(
                expiresValueString,
                "ddd, dd MMM yyyy HH:mm:ss 'GMT'", // Standard format for cookie Expires
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);

            Assert.True(expiresUtc > DateTime.UtcNow, "Cookie Expires should be in the future.");
            Assert.InRange(expiresUtc, expectedMinExpiry, expectedMaxExpiry);
        }

        [Fact]
        public void SetRefreshCookie_WhenEnvironmentIsProductionAndHostMatches_ShouldSetDomain()
        {
            // Arrange
            _mockEnv.Setup(env => env.EnvironmentName).Returns(Environments.Production); // Set to Production
            var defaultContext = new DefaultHttpContext();
            defaultContext.Request.Host = new HostString("sub.ebudget.se"); // Set a matching host

            var cookieService = CreateCookieService(defaultContext);
            string refreshToken = "domain-test-token";
            bool rememberMe = true; // Persistence doesn't affect domain logic here

            // Act
            cookieService.SetRefreshCookie(defaultContext.Response, refreshToken, rememberMe);

            // Assert
            var setCookieHeader = defaultContext.Response.Headers["Set-Cookie"].FirstOrDefault();
            Assert.NotNull(setCookieHeader);
            Assert.Contains("Domain=.ebudget.se", setCookieHeader, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void DeleteRefreshCookie_ShouldAppendCookieWithPastExpiry()
        {
            // Arrange
            var defaultContext = new DefaultHttpContext();
            var cookieService = CreateCookieService(defaultContext);

            // Act
            cookieService.DeleteRefreshCookie(defaultContext.Response);

            // Assert
            var setCookieHeader = defaultContext.Response.Headers["Set-Cookie"].FirstOrDefault();
            Assert.NotNull(setCookieHeader);

            Assert.Contains("RefreshToken=", setCookieHeader); // Name should be present
            Assert.Contains("Expires=", setCookieHeader, StringComparison.OrdinalIgnoreCase); // Expires should exist

            var expiresPart = setCookieHeader
                .Split(';')
                .Select(p => p.Trim())
                .FirstOrDefault(p => p.StartsWith("Expires=", StringComparison.OrdinalIgnoreCase));

            Assert.NotNull(expiresPart);

            var expiresValueString = expiresPart!["Expires=".Length..];
            DateTime expiresUtc = DateTime.ParseExact(
                expiresValueString,
                "ddd, dd MMM yyyy HH:mm:ss 'GMT'",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);

            // Check if it's a date in the past, e.g., very close to UnixEpoch or significantly before now
            // Adding a small buffer because AddDays(-1) from UtcNow might be just moments ago.
            Assert.True(expiresUtc < DateTime.UtcNow.AddSeconds(-10), "Cookie Expires should be in the past for deletion.");
        }
    }
}

