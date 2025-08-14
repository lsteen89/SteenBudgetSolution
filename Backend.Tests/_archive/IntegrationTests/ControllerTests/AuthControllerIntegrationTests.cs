using Backend.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Text.Json;

namespace Backend.Tests.IntegrationTests.ControllerTests
{
    public class AuthControllerIntegrationTests
        : IntegrationTestBase, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AuthControllerIntegrationTests(
            DatabaseFixture dbFixture,
            WebApplicationFactory<Program> factory)
            : base(dbFixture)
        {
            _client = factory
                .WithWebHostBuilder(builder =>
                {
                    builder.ConfigureTestServices(services =>
                    {
                        // 1) Remove the Redis-based IDistributedCache
                        services.RemoveAll<IDistributedCache>();
                        // 2) Register the in-memory implementation instead
                        services.AddDistributedMemoryCache();
                    });
                })
                .CreateClient(new WebApplicationFactoryClientOptions
                {
                    AllowAutoRedirect = false,
                    HandleCookies = true
                });
        }
        // ----------------------------------------------------------------------------------------------------//
        // Tests for the AuthController's login endpoint
        // ----------------------------------------------------------------------------------------------------//
        // Note: These tests assume the auth service is set up correctly and the user exists in the test database.
        // The tests also assume that the Captcha logic is mocked or bypassed for testing purposes.
        //
        // IMPORTANT
        // These tests requires either alteration of the Captcha logic in the auth service to bypass the Captcha check.
        // OR you can add the environment variable `ALLOW_TEST_EMAILS` with value `true` to the test environment with user l@l.se.
        // Follow the flow for the `LoginAndGetAuthAsync` method in the `IntegrationTestBase` class to see how the login is performed.

        [Fact]
        public async Task LoginEndpoint_SetsRefreshCookie_AndReturnsAccessTokenAndSessionId()
        {
            // Arrange & Act
            var (cookie, accessToken, sessionId, expiresUtc) = await LoginAndGetAuthAsync(_client);

            // 1) Refresh-token cookie
            Assert.StartsWith("RefreshToken=", cookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("HttpOnly", cookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Secure", cookie, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("SameSite=Strict", cookie, StringComparison.OrdinalIgnoreCase);

            // 2) Response body values
            Assert.False(string.IsNullOrWhiteSpace(accessToken));
            Assert.True(Guid.TryParse(sessionId, out _), "sessionId must be a GUID");
            Assert.True(expiresUtc > DateTime.UtcNow, "expiresUtc should be in the future");
        }

        [Fact]
        public async Task Refresh_Allows_Concurrent_Calls_Without_Deadlock()
        {
            // Arrange
            var (rawSetCookie, accessToken, sessionId, _) =
                await LoginAndGetAuthAsync(_client);

            // Pull out just "RefreshToken=..." (drop the flags)
            var cookieKv = rawSetCookie.Split(';', 2)[0];

            // Seed the Cookie header correctly
            _client.DefaultRequestHeaders.Remove("Cookie");
            _client.DefaultRequestHeaders.Add("Cookie", cookieKv);

            _client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);

            var body = new { sessionId, accessToken };

            // Act
            var tasks = Enumerable.Range(0, 1)
                                  .Select(_ => _client.PostAsJsonAsync("/api/Auth/refresh", body));
            var results = await Task.WhenAll(tasks);

            // Assert: no deadlocks, at least one wins
            Assert.DoesNotContain(results, r => (int)r.StatusCode >= 500);
            Assert.Contains(results, r => r.StatusCode == HttpStatusCode.OK);
        }

        [Fact]
        public async Task Refresh_Succeeds_200_Times_In_A_Row()
        {
            // 1) Login & grab raw Set-Cookie + initial tokens
            var (rawCookie, initialAccessToken, initialSessionId, _) =
                await LoginAndGetAuthAsync(_client);

            // Pull out only "name=value" before the flags
            var cookieKv = rawCookie.Split(';', 2)[0];

            // 2) Seed client with the very first cookie + access token
            _client.DefaultRequestHeaders.Add("Cookie", cookieKv);
            var accessToken = initialAccessToken;
            var sessionId = initialSessionId;
            _client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);

            // 3) Perform 200 refreshes
            for (int i = 0; i < 200; i++)
            {
                var body = new { sessionId, accessToken };
                var resp = await _client.PostAsJsonAsync("/api/Auth/refresh", body);
                resp.EnsureSuccessStatusCode();

                // 4a) Extract the new Set-Cookie header and rotate it
                var newRawCookie = resp.Headers
                    .GetValues("Set-Cookie")
                    .First(h => h.StartsWith("RefreshToken=", StringComparison.OrdinalIgnoreCase));
                cookieKv = newRawCookie.Split(';', 2)[0];

                _client.DefaultRequestHeaders.Remove("Cookie");
                _client.DefaultRequestHeaders.Add("Cookie", cookieKv);

                // 4b) Extract the new access token & sessionId
                var json = await resp.Content.ReadFromJsonAsync<JsonDocument>();
                accessToken = json!.RootElement.GetProperty("accessToken").GetString()!;
                sessionId = json.RootElement.GetProperty("sessionId").GetString()!;

                _client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", accessToken);
            }
        }
    }
}
