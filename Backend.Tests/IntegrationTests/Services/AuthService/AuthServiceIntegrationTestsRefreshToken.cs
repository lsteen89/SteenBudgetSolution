using Backend.Application.DTO;
using Backend.Test.UserTests;
using System.Security.Claims;
using Xunit;
using System.IdentityModel.Tokens.Jwt;
using Backend.Tests.Helpers;
using Moq;
using Backend.Infrastructure.Security;
using Backend.Infrastructure.WebSockets;
using Backend.Application.DTO.User;

namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsRefreshToken : IntegrationTestBase
    {
        [Fact]
         public async Task RefreshTokenAsync_ValidRequest_ReturnsNewTokens()
        {
            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
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
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
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

            var refreshResult = await AuthService.RefreshTokenAsync(loginResult.RefreshToken, loginResult.SessionId, userAgent, deviceId);
            
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
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(loginResult.Success, "Login should succeed.");

            // Simulate the stored refresh token as expired.
            bool updateResult = await UserSQLProvider.RefreshTokenSqlExecutor.ExpireRefreshTokenAsync(registeredUser.PersoId);
            Assert.True(updateResult, "The refresh token should be expired.");
            // Act: Attempt to refresh tokens.
            var refreshResult = await AuthService.RefreshTokenAsync(loginResult.RefreshToken, loginResult.SessionId, userAgent, deviceId);

            // Assert: Verify failure due to expired refresh token.
            Assert.False(refreshResult.Success, "Refresh token operation should fail for expired token.");
            Assert.Contains("expired", refreshResult.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task RefreshTokenAsync_InvalidRefreshToken_ReturnsError()
        {
            // Arrange: Set up user and login.
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(loginResult.Success, "Login should succeed.");
            
            // Alter the refresh token (simulate tampering)
            string tamperedRefreshToken = loginResult.RefreshToken + "X";

            // Act: Call refresh using the tampered refresh token.
            var refreshResult = await AuthService.RefreshTokenAsync(tamperedRefreshToken, loginResult.SessionId, deviceId, userAgent);

            // Assert: Verify refresh fails due to invalid token.
            Assert.False(refreshResult.Success, "Refresh token operation should fail with an invalid token.");
            Assert.Contains("not found", refreshResult.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task LoginTwice_MultipleRefreshTokenRecordsExist_WithUniqueSessionIds()
        {
            // Arrange: Set up user metadata and login credentials.
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            // Set up and confirm the user.
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act: First login.
            var firstLoginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(firstLoginResult.Success, "First login should succeed.");

            // Act: Second login with the same device and user agent.
            var secondLoginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(secondLoginResult.Success, "Second login should succeed.");

            // Query the database for refresh tokens belonging to this user.
            var refreshTokens = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);

            // Assert: Multiple refresh token records exist for the user.
            Assert.True(refreshTokens.Count() >= 2, "There should be at least two refresh token records for multiple logins.");

            // Optionally, verify that the SessionIds are unique and that refresh tokens differ.
            var tokenList = refreshTokens.ToList();
            Assert.NotEqual(tokenList[0].SessionId, tokenList[1].SessionId);
            Assert.NotEqual(firstLoginResult.RefreshToken, secondLoginResult.RefreshToken);
        }

        [Fact]
        public async Task LoginFromTwoDevices_LogoutDeletesAllRefreshTokens()
        {
            // Arrange: Set up default metadata for two different devices.
            var (ipAddress, deviceId1, userAgent1) = AuthTestHelper.GetDefaultMetadata();
            var deviceId2 = "test-device-2";
            var userAgent2 = "Mozilla/5.0 (compatible; TestBrowser/2.0)";

            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            // Insert and confirm the user
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act: Log in from the first device.
            var firstLoginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId1, userAgent1);
            Assert.True(firstLoginResult.Success, "First login should succeed.");

            // Act: Log in from the second device.
            var secondLoginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId2, userAgent2);
            Assert.True(secondLoginResult.Success, "Second login should succeed.");

            // Assert: Query the database for refresh tokens belonging to this user.
            var refreshTokens = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);
            Assert.Equal(2, refreshTokens.Count());

            // Prepare for logout: validate tokens and extract principals.
            var principal1 = jwtService.ValidateToken(firstLoginResult.AccessToken);
            Assert.NotNull(principal1);
            Assert.True(principal1.Identity.IsAuthenticated, "First principal should be authenticated.");

            var principal2 = jwtService.ValidateToken(secondLoginResult.AccessToken);
            Assert.NotNull(principal2);
            Assert.True(principal2.Identity.IsAuthenticated, "Second principal should be authenticated.");

            // **Optionally, extract and assert claims for further verification:**
            var subClaim1 = principal1.FindFirst(JwtRegisteredClaimNames.Sub) ?? principal1.FindFirst(ClaimTypes.NameIdentifier);
            Assert.Equal(registeredUser.PersoId.ToString(), subClaim1.Value);
            var subClaim2 = principal2.FindFirst(JwtRegisteredClaimNames.Sub) ?? principal2.FindFirst(ClaimTypes.NameIdentifier);
            Assert.Equal(registeredUser.PersoId.ToString(), subClaim2.Value);

            // Arrange: Mock WebSocketManager to expect a LOGOUT message for each session.
            WebSocketManagerMock
                .Setup(x => x.SendMessageAsync(
                    It.Is<UserSessionKey>(k =>
                        k.UserId == registeredUser.PersoId.ToString() &&
                        (k.SessionId == firstLoginResult.SessionId || k.SessionId == secondLoginResult.SessionId)),
                    It.Is<string>(msg => msg == "LOGOUT")))
                .Returns(Task.CompletedTask)
                .Verifiable();

            // Act: Log out from both sessions.
            await AuthService.LogoutAsync(principal1, firstLoginResult.AccessToken, firstLoginResult.RefreshToken, firstLoginResult.SessionId, logoutAll: false);
            await AuthService.LogoutAsync(principal2, secondLoginResult.AccessToken, secondLoginResult.RefreshToken, secondLoginResult.SessionId, logoutAll: false);

            // Assert: Verify that SendMessageAsync was called twice.
            WebSocketManagerMock.Verify(x => x.SendMessageAsync(
                It.Is<UserSessionKey>(k =>
                    k.UserId == registeredUser.PersoId.ToString() &&
                    (k.SessionId == firstLoginResult.SessionId || k.SessionId == secondLoginResult.SessionId)),
                "LOGOUT"),
                Times.Exactly(2));
        }
        [Fact]
        public async Task RefreshTokenAsync_InvalidatedRefreshToken_BlacklistedAccessToken_ReturnsError()
        {
            // Arrange: Setup user, confirm email, and log in to get tokens.
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(loginResult.Success, "Login should succeed.");
            Assert.False(string.IsNullOrEmpty(loginResult.RefreshToken), "Refresh token should be set.");
            Assert.False(string.IsNullOrEmpty(loginResult.AccessToken), "Access token should be set.");

            // Simulate token invalidation: expire the refresh token.
            bool expireResult = await UserSQLProvider.RefreshTokenSqlExecutor.ExpireRefreshTokenAsync(registeredUser.PersoId);
            Assert.True(expireResult, "The refresh token should be invalidated (expired).");

            // Blacklist the access token.
            bool blacklistResult = await jwtService.BlacklistJwtTokenAsync(loginResult.AccessToken);
            Assert.True(blacklistResult, "The access token should be blacklisted.");

            // Act: Attempt to refresh tokens with the invalidated refresh token and blacklisted access token.
            var refreshResult = await AuthService.RefreshTokenAsync(loginResult.RefreshToken, loginResult.SessionId, userAgent, deviceId);

            // Assert: Verify that the refresh operation fails.
            Assert.False(refreshResult.Success, "Refresh operation should fail for an invalidated refresh token.");
            Assert.Contains("expired", refreshResult.Message, StringComparison.OrdinalIgnoreCase);
        }
        [Fact]
        public async Task RefreshTokenAsync_ValidRequest_BlacklistsOldAccessTokenJti_And_SetsCorrectExpiry()
        {
            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
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
            var loginResult = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(loginResult.Success, "Initial login should succeed.");
            Assert.False(string.IsNullOrEmpty(loginResult.RefreshToken), "Refresh token should not be null or empty.");

            // Retrieve the refresh token record from the database.
            // Hash the refresh token to use in the query.
            var hashedRefreshToken = TokenGenerator.HashToken(loginResult.RefreshToken);
            var oldRefreshTokenRecords = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(refreshToken: hashedRefreshToken);

            var oldRefreshTokenRecord = oldRefreshTokenRecords.FirstOrDefault();


            Assert.NotNull(oldRefreshTokenRecord); // Ensure you got a record
            string oldAccessTokenJti = oldRefreshTokenRecord.AccessTokenJti;
            Assert.False(string.IsNullOrEmpty(oldAccessTokenJti), "Old access token JTI should not be null or empty.");

            // Act: Call the refresh method to rotate tokens.
            var refreshResult = await AuthService.RefreshTokenAsync(loginResult.RefreshToken, loginResult.SessionId, userAgent, deviceId);
            Assert.True(refreshResult.Success, "Refresh token operation should succeed.");
            Assert.False(string.IsNullOrEmpty(refreshResult.AccessToken), "New access token should be returned.");
            Assert.False(string.IsNullOrEmpty(refreshResult.RefreshToken), "New refresh token should be returned.");

            // Assert: Check that the old access token's JTI is now blacklisted.
            var blacklistedToken = await UserSQLProvider.RefreshTokenSqlExecutor.GetBlacklistedTokenByJtiAsync(oldAccessTokenJti);
            Assert.NotNull(blacklistedToken);
            Assert.Equal(oldAccessTokenJti, blacklistedToken.Jti);

            // Verify that the blacklisted token's expiry is in the future.
            Assert.True(blacklistedToken.ExpiryDate > DateTime.UtcNow, "Blacklisted token expiry should be in the future.");
        }

    }
}
