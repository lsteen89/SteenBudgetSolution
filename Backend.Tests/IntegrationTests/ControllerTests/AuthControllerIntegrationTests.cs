using Backend.Application.DTO;
using Backend.Test.UserTests;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Json;
using Xunit;
using Backend.Tests.Helpers;

namespace Backend.Tests.IntegrationTests.ControllerTests
{
    public class AuthControllerIntegrationTests : IntegrationTestBase, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AuthControllerIntegrationTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false,
                HandleCookies = true // Ensure cookies are handled automatically
            });
        }

        [Fact]
        public async Task LoginEndpoint_SetsAuthCookies()
        {
            // Arrange: Create and confirm user
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto { Email = "l@l.se", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act: call login endpoint
            var response = await _client.PostAsJsonAsync("/api/Auth/login", userLoginDto);

            // Assert: Verify response is OK and cookies are set
            Assert.True(response.IsSuccessStatusCode);
            IEnumerable<string> cookies;
            Assert.True(response.Headers.TryGetValues("Set-Cookie", out cookies));
            Assert.Contains(cookies, c => c.Contains("AccessToken"));
            Assert.Contains(cookies, c => c.Contains("RefreshToken"));
        }
    }
}
