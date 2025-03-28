using Backend.Infrastructure.Security;
using Backend.Infrastructure.WebSockets;
using Backend.Tests.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using Xunit;
using Backend.Application.DTO.User;
using Backend.Application.DTO.Auth;

namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsLogin : IntegrationTestBase
    {
        private Dictionary<string, (string Value, CookieOptions Options)> cookieContainer;
        public AuthServiceIntegrationTestsLogin()
        {
            cookieContainer = new Dictionary<string, (string Value, CookieOptions Options)>();
        }
        [Fact]
        public async Task LoginAsync_ValidCredentials_IntegrationTest()
        {
            // Arrange
            WebSocketManagerMock
                .Setup(manager => manager.SendMessageAsync(It.IsAny<UserSessionKey>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();

            // Insert a user into the database using SetupUserAsync
            var registeredUser = await SetupUserAsync();

            // Verify email in database
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert
            Assert.True(result.Success);
            Assert.Equal("Login successful.", result.Message);

            // Ensure correct user details in response
            Assert.Equal(userLoginDto.Email, result.UserName);

            // **Assert that a valid JWT token is returned**
            Assert.False(string.IsNullOrEmpty(result.AccessToken), "AccessToken should not be null or empty.");

            // Decode and validate JWT token
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(result.AccessToken);

            Assert.Equal("eBudget", token.Issuer);
            Assert.Contains("eBudget", token.Audiences);
            Assert.Equal(registeredUser.Email, token.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
            Assert.Equal(registeredUser.PersoId.ToString(), token.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);

            // **Verify Token Expiration**
            var expClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?.Value;
            Assert.NotNull(expClaim);
            var expUnix = long.Parse(expClaim);
            var expDate = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
            Assert.True(expDate > DateTime.UtcNow, "Token should not be expired.");

            // **Ensure JTI exists**
            var jtiClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti);
            Assert.NotNull(jtiClaim);
            Assert.False(string.IsNullOrEmpty(jtiClaim.Value), "JTI should not be null or empty.");
        }


        [Fact]
        public async Task LoginAsync_ValidCredentials_TokenHasExpectedClaims()
        {
            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert
            Assert.True(result.Success);
            Assert.False(string.IsNullOrEmpty(result.AccessToken), "AccessToken should not be null or empty.");

            // Decode and validate JWT token
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(result.AccessToken);

            Assert.Equal("eBudget", token.Issuer);
            Assert.Contains("eBudget", token.Audiences);
            Assert.Equal(registeredUser.Email, token.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
            Assert.Equal(registeredUser.PersoId.ToString(), token.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);

            // Verify token expiration
            var expClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?.Value;
            Assert.NotNull(expClaim);
            var expUnix = long.Parse(expClaim);
            var expDate = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
            Assert.True(expDate > DateTime.UtcNow, "Token should not be expired.");
        }

        [Fact]
        public async Task LoginAsync_TokenExpires_ShouldDenyAccess()
        {
            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            Assert.NotNull(registeredUser);
            Assert.NotNull(registeredUser.PersoId);
            Assert.NotNull(registeredUser.Email);

            // Simulate token creation time
            var tokenCreationTime = DateTime.UtcNow;
            MockTimeProvider.Setup(tp => tp.UtcNow).Returns(tokenCreationTime);

            // Act: Perform the login
            var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(result.Success, "Login should succeed.");
            Assert.False(string.IsNullOrEmpty(result.AccessToken), "JWT AccessToken should not be null or empty.");

            // Decode JWT token to extract expiration time
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(result.AccessToken);

            var expClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?.Value;
            Assert.NotNull(expClaim);

            var expUnix = long.Parse(expClaim);
            var expirationTime = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
            Assert.True(expirationTime > DateTime.UtcNow, "Token should initially be valid.");

            // Simulate time passing to trigger token expiration (JWT expires after 15 minutes)
            MockTimeProvider.Setup(tp => tp.UtcNow).Returns(expirationTime.AddMinutes(1)); // Simulate 1 min past expiration

            // Attempt to validate the expired token
            var principal = jwtService.ValidateToken(result.AccessToken);

            // Assert: Token should be invalid after expiration
            Assert.True(principal == null, "Expired token should be invalid and not return a principal.");
        }

        [Fact]
        public async Task LoginAsync_ConcurrentLogins_ShouldWork()
        {
            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act - Perform multiple login attempts
            var result1 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            var result2 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert
            Assert.True(result1.Success);
            Assert.True(result2.Success);
            Assert.NotEqual(result1.AccessToken, result2.AccessToken); // Tokens should be unique
        }
        [Fact]
        public async Task LoginAsync_ValidCredentials_ShouldReturnSecureToken()
        {
            // Mock production environment
            MockEnvironmentService
                .Setup(e => e.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"))
                .Returns("Production");

            // Validate the mock before running the test
            var mockValue = MockEnvironmentService.Object.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            Assert.Equal("Production", mockValue);

            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert
            Assert.True(result.Success);
            Assert.False(string.IsNullOrEmpty(result.AccessToken), "JWT AccessToken should not be null or empty.");

            // Decode and validate JWT token
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(result.AccessToken);

            Assert.Equal("eBudget", token.Issuer);
            Assert.Contains("eBudget", token.Audiences);
            Assert.Equal(registeredUser.Email, token.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
            Assert.Equal(registeredUser.PersoId.ToString(), token.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);

            // Ensure JTI exists
            var jtiClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti);
            Assert.NotNull(jtiClaim);
            Assert.False(string.IsNullOrEmpty(jtiClaim.Value), "JTI should not be null or empty.");

            // Ensure Expiration Claim Exists
            var expClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?.Value;
            Assert.NotNull(expClaim);
            var expUnix = long.Parse(expClaim);
            var expDate = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
            Assert.True(expDate > DateTime.UtcNow, "Token should not be expired.");

            // **Security Checks: Ensure Best Practices**
            Assert.Contains(token.Claims, c => c.Type == JwtRegisteredClaimNames.Iat); // Issued At
            Assert.Contains(token.Claims, c => c.Type == JwtRegisteredClaimNames.Jti); // JWT Unique Identifier
            Assert.Contains(token.Claims, c => c.Type == JwtRegisteredClaimNames.Sub); // Subject (User ID)

            // **Verify Algorithm Used**
            Assert.Equal(SecurityAlgorithms.HmacSha256, token.SignatureAlgorithm);
        }



        [Fact]
        public async Task LoginAsync_TamperedToken_ShouldDenyAccess()
        {
            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Ensure user setup was successful
            Assert.NotNull(registeredUser);
            Assert.NotNull(registeredUser.PersoId);
            Assert.NotNull(registeredUser.Email);

            // Act: Perform the login and get the JWT token
            var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            Assert.True(result.Success, "Login should succeed.");
            Assert.False(string.IsNullOrEmpty(result.AccessToken), "JWT AccessToken should not be null or empty.");

            // Tamper with the token by modifying a single character
            var tamperedToken = result.AccessToken.Substring(0, result.AccessToken.Length - 1) + "X";

            // Act - Attempt to validate the tampered token
            var principal = jwtService.ValidateToken(tamperedToken);

            // Assert: The tampered token should be rejected
            Assert.Null(principal);
        }


        [Fact]
        public async Task LoginAsync_ShouldReturnValidAccessToken()
        {
            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Ensure user setup was successful
            Assert.NotNull(registeredUser);
            Assert.NotNull(registeredUser.PersoId);
            Assert.NotNull(registeredUser.Email);

            // Act: Perform login
            var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert
            Assert.True(result.Success, "Login should succeed.");
            Assert.False(string.IsNullOrEmpty(result.AccessToken), "JWT AccessToken should not be null or empty.");

            // Decode and validate JWT token
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(result.AccessToken);

            Assert.Equal("eBudget", token.Issuer);
            Assert.Contains("eBudget", token.Audiences);
            Assert.Equal(registeredUser.Email, token.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
            Assert.Equal(registeredUser.PersoId.ToString(), token.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);

            // Ensure Expiration Claim Exists
            var expClaim = token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Exp)?.Value;
            Assert.NotNull(expClaim);
            var expUnix = long.Parse(expClaim);
            var expDate = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
            Assert.True(expDate > DateTime.UtcNow, "Token should not be expired.");
        }

        [Fact]
        public void Cookies_ShouldAppendCorrectly()
        {
            // Arrange
            var cookieName = "test_cookie";
            var cookieValue = "test_value";
            var cookieOptions = new CookieOptions { HttpOnly = true };

            // Act
            HttpContext.Response.Cookies.Append(cookieName, cookieValue, cookieOptions);

            // Assert
            Assert.True(CookieContainer.ContainsKey(cookieName));
            Assert.Equal(cookieValue, CookieContainer[cookieName].Value);
            Assert.Equal(cookieOptions.HttpOnly, CookieContainer[cookieName].Options.HttpOnly);
        }
        [Fact]
        public async Task LoginAsync_ShouldLockUser_AfterMultipleFailedAttempts()
        {
            // Arrange
            var email = "test@example.com";
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto { Email = email, Password = "WrongPassword" };

            // Ensure the user exists
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Simulate multiple failed login attempts
            for (int i = 0; i < 5; i++)
            {
                var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
                Assert.False(result.Success, $"Attempt {i + 1}: Login should fail");
            }

            // Act
            var isLockedOut = await UserAuthenticationService.CheckLoginAttemptsAsync(email);

            // Assert
            Assert.True(isLockedOut, "User should be locked out after exceeding failed attempts");
        }
        [Fact]
        public async Task LoginAsync_ShouldUnlockUser_AfterLockoutPeriod()
        {
            // Arrange
            var email = "test@example.com";
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto { Email = email, Password = "Password123!" };

            // Ensure the user exists and gets locked out
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            await UserAuthenticationService.LockUserAsync(email, TimeSpan.FromMinutes(1)); // Lock for 1 minute

            // Act 1: Verify the user is locked out
            var isLockedOutBefore = await UserAuthenticationService.CheckLoginAttemptsAsync(email);
            Assert.True(isLockedOutBefore, "User should initially be locked out");

            // Wait for lockout period to expire
            await Task.Delay(TimeSpan.FromMinutes(2));

            // Act 2: Attempt login after lockout period
            var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert
            Assert.True(result.Success, "User should be able to log in after the lockout period expires");
        }
        [Fact]
        public async Task LoginAsync_SuccessfulLogin_ShouldResetFailedAttemptsCounter()
        {
            // Arrange
            var email = "test@example.com";
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var wrongLoginDto = new UserLoginDto { Email = email, Password = "Password1234!" };
            var correctLoginDto = new UserLoginDto { Email = email, Password = "Password123!" };

            // Ensure the user exists
            var registeredUser = await SetupUserAsync();

            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Simulate a failed login attempt
            await AuthService.LoginAsync(wrongLoginDto, ipAddress, deviceId, userAgent);

            // Verify failed attempts count
            var failedAttempts = await UserSQLProvider.AuthenticationSqlExecutor.GetRecentFailedAttemptsAsync(registeredUser.PersoId);
            Assert.Equal(1, failedAttempts);

            // Act: Successful login
            var result = await AuthService.LoginAsync(correctLoginDto, ipAddress, deviceId, userAgent);

            // Assert
            Assert.True(result.Success, "User should successfully log in with correct credentials");

            // Verify failed attempts counter is reset
            failedAttempts = await UserSQLProvider.AuthenticationSqlExecutor.GetRecentFailedAttemptsAsync(registeredUser.PersoId);
            Assert.Equal(0, failedAttempts);
        }
        [Fact]
        public async Task LoginAsync_ShouldStoreValidRefreshToken()
        {
            // Arrange
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert: Validate login success and refresh token presence
            Assert.True(result.Success, "Login should succeed");
            Assert.False(string.IsNullOrEmpty(result.RefreshToken), "RefreshToken should not be null or empty");
            Console.WriteLine($"Refresh Token: {result.RefreshToken}");

            // Optionally, query the database to confirm the refresh token is stored (hashed)
            var providedHashedToken = TokenGenerator.HashToken(result.RefreshToken);
            //RefreshJwtTokenEntity
            var storedTokens = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(refreshToken : providedHashedToken);
            var storedToken = storedTokens.FirstOrDefault();
            Assert.NotNull(storedToken);
            Console.WriteLine($"Stored Token: {storedToken.RefreshToken}");
            // Verify that the stored token is the hashed version of the refresh token received
            var expectedHashedToken = TokenGenerator.HashToken(result.RefreshToken);
            Assert.Equal(expectedHashedToken, storedToken.RefreshToken);

            

            // Verify the expiry date is correctly set (approximately 30 days in the future)
            Assert.True(storedToken.RefreshTokenExpiryDate > DateTime.UtcNow.AddDays(29) &&
                        storedToken.RefreshTokenExpiryDate <= DateTime.UtcNow.AddDays(30),
                        "Refresh token expiry should be around 30 days from now.");
        }
        [Fact]
        public async Task LoginFromDifferentDevices_ShouldStoreMultipleRefreshTokens()
        {
            // Arrange: Set up metadata for two different devices.
            var (ipAddress, deviceId1, userAgent1) = AuthTestHelper.GetDefaultMetadata();
            var deviceId2 = "test-device-2";
            var userAgent2 = "Mozilla/5.0 (compatible; TestBrowser/2.0)";

            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            // Set up and confirm the user.
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act: Log in from the first device.
            var result1 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId1, userAgent1);
            Assert.True(result1.Success, "First login should succeed.");

            // Act: Log in from the second device.
            var result2 = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId2, userAgent2);
            Assert.True(result2.Success, "Second login should succeed.");

            // Assert: There should be two refresh token records in the database for the same user.
            var refreshTokens = await UserSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(registeredUser.PersoId);
            Assert.Equal(2, refreshTokens.Count());
        }

    }
}
