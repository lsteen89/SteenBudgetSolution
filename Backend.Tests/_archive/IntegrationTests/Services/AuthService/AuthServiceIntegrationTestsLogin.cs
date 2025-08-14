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
using Tests.Helpers;
using Newtonsoft.Json.Linq;
using Microsoft.Extensions.DependencyInjection;
using System.Net.WebSockets;
using Backend.Tests.Fixtures;

namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsLogin : IntegrationTestBase
    {
        private Dictionary<string, (string Value, CookieOptions Options)> cookieContainer;
        public AuthServiceIntegrationTestsLogin(DatabaseFixture fixture) : base(fixture)
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
            var outcome = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert: succeed + grab tokens in two lines
            var login = outcome.ShouldBeSuccess();                      // asserts & casts
            Assert.False(string.IsNullOrEmpty(login.RefreshToken));     // extra check

            var sessionId = login.Access.SessionId;
            var accessToken = login.Access.Token;
            var refreshToken = login.RefreshToken;

            // **Assert that a valid JWT token is returned**
            Assert.False(string.IsNullOrEmpty(accessToken), "AccessToken should not be null or empty.");

            // Decode and validate JWT token
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(accessToken);

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
            var outcome = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert: succeed + grab tokens in two lines
            var login = outcome.ShouldBeSuccess();                      // asserts & casts
            Assert.False(string.IsNullOrEmpty(login.RefreshToken));     // extra check

            var sessionId = login.Access.SessionId;
            var accessToken = login.Access.Token;
            var refreshToken = login.RefreshToken;

            // Decode and validate JWT token
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(accessToken);

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
            // –– Arrange –– create & confirm user
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };

            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

            // freeze "now"
            var now = DateTime.UtcNow;
            MockTimeProvider.Setup(t => t.UtcNow).Returns(now);

            // login once
            var login = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();
            var accessToken = login.Access.Token;

            // token is valid right after issuance
            Assert.NotNull(jwtService.ValidateToken(accessToken));

            // –– Fast-forward 1 min past exp ––
            MockTimeProvider
                .Setup(t => t.UtcNow)
                .Returns(login.Access.ExpiresUtc.AddMinutes(1));

            // Validate again → should be null (expired)
            Assert.Null(jwtService.ValidateToken(accessToken));
        }

        [Fact]
        public async Task LoginAsync_ConcurrentLogins_ShouldWork()
        {
            // Arrange
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

            // Act – two parallel logins
            var r1 = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();
            var r2 = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();

            // Assert
            Assert.NotEqual(r1.Access.Token, r2.Access.Token);   // unique access tokens
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
            var outcome = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);

            // Assert: succeed + grab tokens in two lines
            var login = outcome.ShouldBeSuccess();                      // asserts & casts
            Assert.False(string.IsNullOrEmpty(login.RefreshToken));     // extra check

            // you now have:
            var sessionId = login.Access.SessionId;
            var accessToken = login.Access.Token;
            var refreshToken = login.RefreshToken;

            // Decode and validate JWT token
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(accessToken);

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
            // ── Arrange ──────────────────────────────────────────────────────────
            var (ip, deviceId, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };

            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

            // Act: real login
            var login = (await AuthService.LoginAsync(dto, ip, deviceId, ua))
                        .ShouldBeSuccess();
            var accessToken = login.Access.Token;
            var tampered = accessToken[..^1] + (accessToken[^1] == 'X' ? 'Y' : 'X');

            // 1) Raw handler should throw because the key id (kid) no longer matches
            var handler = new JwtSecurityTokenHandler();
            var baseParams = ServiceProvider.GetRequiredService<TokenValidationParameters>();

            Assert.Throws<SecurityTokenSignatureKeyNotFoundException>(() =>
                handler.ValidateToken(tampered, baseParams, out _));

            // 2) App‐level validator still returns null
            Assert.Null(jwtService.ValidateToken(tampered));
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

            // Act: Perform the login and get the JWT token
            var outcome = await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent);
            // Assert: succeed + grab tokens in two lines
            var login = outcome.ShouldBeSuccess();                      // asserts & casts
            Assert.False(string.IsNullOrEmpty(login.RefreshToken));     // extra check


            var sessionId = login.Access.SessionId;
            var accessToken = login.Access.Token;
            var refreshToken = login.RefreshToken;


            // Decode and validate JWT token
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(accessToken);

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
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto { Email = email, Password = "WrongPassword" };

            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

            //simulate five failed attempts
            for (int i = 0; i < 5; i++)
                (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeFail();

            // Act
            var isLockedOut = await UserAuthenticationService.CheckLoginAttemptsAsync(email);

            // Assert
            Assert.True(isLockedOut);
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

            // Act 2 – attempt login after lock-out window
            var tokens = (await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent))
                            .ShouldBeSuccess();          // ⬅️ asserts & returns LoginOutcome.Success

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
            var tokens = (await AuthService.LoginAsync(correctLoginDto, ipAddress, deviceId, userAgent))
                            .ShouldBeSuccess();          // ⬅️ asserts & returns LoginOutcome.Success

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
            var result = (await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId, userAgent))
                            .ShouldBeSuccess();          // ⬅️ asserts & returns LoginOutcome.Success

            // tokens now holds everything you need
            var sessionId = result.Access.SessionId;
            var accessToken = result.Access.Token;
            var refreshToken = result.RefreshToken;

            Assert.False(string.IsNullOrEmpty(result.RefreshToken), "RefreshToken should not be null or empty");
            Console.WriteLine($"Refresh Token: {result.RefreshToken}");

            // Optionally, query the database to confirm the refresh token is stored (hashed)
            var providedHashedToken = TokenGenerator.HashToken(result.RefreshToken);
            //RefreshJwtTokenEntity
            var (conn, tx) = await CreateTransactionAsync();

            try
            {
                // call the new signature that takes both conn and tx
                var storedTokens = await UserSQLProvider
                    .RefreshTokenSqlExecutor
                    .GetRefreshTokensAsync(conn, tx, hashedToken: providedHashedToken);

                // commit so the helper cleans up properly
                await tx.CommitAsync();

                // your assertions
                Assert.NotNull(storedTokens.FirstOrDefault());
                Assert.Equal(providedHashedToken, storedTokens.First().HashedToken);
            }
            finally
            {
                await conn.DisposeAsync();
            }
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
            var result1 = (await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId1, userAgent1))
                            .ShouldBeSuccess();          // ⬅️ asserts & returns LoginOutcome.Success

            // Act: Log in from the second device.
            var result2 = (await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId2, userAgent2))
                            .ShouldBeSuccess();          // ⬅️ asserts & returns LoginOutcome.Success

            // Assert (inside a tx because GetRefreshTokensAsync now expects it)
            var count = await RunInTxAsync(async (c, t) =>
                (await UserSQLProvider.RefreshTokenSqlExecutor
                    .GetRefreshTokensAsync(c, t, registeredUser.PersoId)).Count());

            Assert.Equal(2, count);
        }

        /* -------------------------------------------------------------------------- */
        /* 1. /auth/refresh – happy-path: get new access-token while old one is stale  */
        /* -------------------------------------------------------------------------- */
        [Fact]
        public async Task RefreshEndpoint_WithValidRefreshToken_ShouldIssueFreshAccessToken()
        {
            // login first
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock"
            };

            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

            var login = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();

            /* fast-forward clock so AT is expired but RT is still valid */
            MockTimeProvider.Setup(t => t.UtcNow).Returns(login.Access.ExpiresUtc.AddSeconds(1));

            // hit the real service-layer “check & refresh”
            var result = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(
                    login.Access.Token,
                    login.RefreshToken,
                    login.Access.SessionId,
                    ua,
                    dev,
                    conn,       
                    tx         
                )
            );

            Assert.True(result.Authenticated);
            Assert.NotNull(result.AccessToken);
            Assert.NotEqual(login.Access.Token, result.AccessToken);           // new token
        }

        /* -------------------------------------------------------------------------- */
        /* 2. RT replay – using the same refresh-token twice should be rejected       */
        /* -------------------------------------------------------------------------- */
        [Fact]
        public async Task RefreshEndpoint_ReusingRefreshToken_ShouldBeRejected()
        {
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto { Email = "test@example.com", Password = "Password123!", CaptchaToken = "mock" };

            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

            var login = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();

            // first refresh succeeds
            var r1 = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(
                    login.Access.Token,
                    login.RefreshToken,
                    login.Access.SessionId,
                    ua,
                    dev,
                    conn,
                    tx
                )
            );
            Assert.True(r1.Authenticated);

            // second refresh must fail
            var r2 = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(
                    login.Access.Token,
                    login.RefreshToken,
                    login.Access.SessionId,
                    ua,
                    dev,
                    conn,
                    tx
                )
            );

            Assert.False(r2.Authenticated);
        }

        /* -------------------------------------------------------------------------- */
        /* 4. LogoutAsync should notify WS and close a single session only            */
        /* -------------------------------------------------------------------------- */
        [Fact]
        public async Task LogoutAsync_ShouldSendLogoutMessage_AndKeepOtherSessions()
        {
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto { Email = "test@example.com", Password = "Password123!", CaptchaToken = "mock" };

            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

            // two different sessions
            var s1 = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();
            var s2 = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();

            var expectedKey = new UserSessionKey(user.PersoId, s1.Access.SessionId);
            WebSocketManagerMock.ResetCalls();

            await AuthService.LogoutAsync(
                s1.Access.Token, s1.RefreshToken, s1.Access.SessionId, logoutAllUsers: false);

            // WS called exactly once for S-1
            WebSocketManagerMock.Verify(
                ws => ws.SendMessageAsync(expectedKey, "LOGOUT"),
                Times.Once);

            // Refresh-token store still has 1 entry left (S-2)
            // —— now query remaining tokens under a tx ——
            var (conn, tx) = await CreateTransactionAsync();
            try
            {
                var tokensLeft = await UserSQLProvider
                    .RefreshTokenSqlExecutor
                    .GetRefreshTokensAsync(conn, tx, user.PersoId);

                await tx.CommitAsync();
                Assert.Single(tokensLeft);
            }
            finally
            {
                await conn.DisposeAsync();
            }
        }


        /* -------------------------------------------------------------------------- */
        /* 5. Black-listed access-token should be rejected by middleware              */
        /* -------------------------------------------------------------------------- */
        [Fact]
        public async Task Request_WithBlacklistedToken_ShouldReturn401()
        {
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var dto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock"
            };

            // Arrange: register & login
            var user = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);
            var login = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();

            // Extract the JTI from the access token:
            var jti = new JwtSecurityTokenHandler()
                          .ReadJwtToken(login.Access.Token)
                          .Claims
                          .First(c => c.Type == JwtRegisteredClaimNames.Jti)
                          .Value;

            // Blacklist that JTI inside a real DB transaction:
            var (conn, tx) = await CreateTransactionAsync();
            try
            {
                // Note: pass the _jti_, not the full token string
                await TokenBlacklistService.BlacklistTokenAsync(
                    jti,
                    login.Access.ExpiresUtc,
                    conn,
                    tx
                );

                await tx.CommitAsync();
            }
            finally
            {
                await tx.DisposeAsync();
                await conn.DisposeAsync();
            }

            // Now ValidateToken should see the JTI in the table/cache and return null
            Assert.Null(jwtService.ValidateToken(login.Access.Token));
        }

    }
}
