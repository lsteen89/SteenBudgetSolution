using Backend.Application.DTO;
using Backend.Test.UserTests;
using System.Security.Claims;
using Xunit;
using System.IdentityModel.Tokens.Jwt;


namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsRefreshToken : IntegrationTestBase
    {
        [Fact]
        public async Task RefreshTokenAsync_ValidRequest_ReturnsNewTokens()
        {
            // Arrange
            string ipAddress = "127.0.0.1";
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };


            // Set up the user and confirm their email.
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Perform an initial login to obtain tokens.
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress);
            Assert.True(loginResult.Success, "Initial login should succeed.");
            Assert.False(string.IsNullOrEmpty(loginResult.RefreshToken), "Refresh token should not be null or empty.");

            // Create a principal with the user's claims.
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, registeredUser.PersoId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, registeredUser.Email)
            };
            var identity = new ClaimsIdentity(claims, "mock");
            var principal = new ClaimsPrincipal(identity);
            // Extract the access token from the login result.
            var authToken = loginResult.AccessToken;
            // Act: Call the refresh method directly from the service.
            var refreshResult = await AuthService.RefreshTokenAsync(registeredUser.PersoId, loginResult.RefreshToken, authToken, principal);

            // Assert: Validate that new tokens are returned and are different from the original ones.
            Assert.True(refreshResult.Success, "Refresh token operation should succeed.");
            Assert.False(string.IsNullOrEmpty(refreshResult.AccessToken), "New access token should be returned.");
            Assert.False(string.IsNullOrEmpty(refreshResult.RefreshToken), "New refresh token should be returned.");

            // Ensure tokens have been rotated (i.e. they differ from the originals)
            Assert.NotEqual(loginResult.AccessToken, refreshResult.AccessToken);
            Assert.NotEqual(loginResult.RefreshToken, refreshResult.RefreshToken);
        }
        [Fact]
        public async Task RefreshTokenAsync_ExpiredStoredRefreshToken_ReturnsError()
        {
            // Arrange: Set up user and login to get tokens.
            string ipAddress = "127.0.0.1";
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress);
            Assert.True(loginResult.Success, "Login should succeed.");

            // Simulate the stored refresh token as expired.
            bool updateResult = await UserSQLProvider.RefreshTokenSqlExecutor.ExpireRefreshTokenAsync(registeredUser.PersoId);
            Assert.True(updateResult, "The refresh token should be expired.");
            // Act: Attempt to refresh tokens.
            var refreshResult = await AuthService.RefreshTokenAsync(registeredUser.PersoId, loginResult.RefreshToken, loginResult.AccessToken);

            // Assert: Verify failure due to expired refresh token.
            Assert.False(refreshResult.Success, "Refresh token operation should fail for expired token.");
            Assert.Contains("expired", refreshResult.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task RefreshTokenAsync_InvalidRefreshToken_ReturnsError()
        {
            // Arrange: Set up user and login.
            string ipAddress = "127.0.0.1";
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress);
            Assert.True(loginResult.Success, "Login should succeed.");

            // Alter the refresh token (simulate tampering)
            string tamperedRefreshToken = loginResult.RefreshToken + "X";

            // Act: Call refresh using the tampered refresh token.
            var refreshResult = await AuthService.RefreshTokenAsync(registeredUser.PersoId, tamperedRefreshToken, loginResult.AccessToken);

            // Assert: Verify refresh fails due to invalid token.
            Assert.False(refreshResult.Success, "Refresh token operation should fail with an invalid token.");
            Assert.Contains("invalid", refreshResult.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task RefreshTokenAsync_InvalidAccessToken_ReturnsError()
        {
            // Arrange: Set up user and login.
            string ipAddress = "127.0.0.1";
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress);
            Assert.True(loginResult.Success, "Login should succeed.");

            // Tamper with the access token
            string tamperedAccessToken = loginResult.AccessToken.Substring(0, loginResult.AccessToken.Length - 1) + "X";

            // Act: Attempt to refresh tokens with a tampered access token.
            var refreshResult = await AuthService.RefreshTokenAsync(registeredUser.PersoId, loginResult.RefreshToken, tamperedAccessToken);

            // Assert: Verify that refresh fails due to invalid access token.
            Assert.False(refreshResult.Success, "Refresh token operation should fail with an invalid access token.");
            Assert.Contains("invalid or expired", refreshResult.Message, StringComparison.OrdinalIgnoreCase);
        }
    }
}
