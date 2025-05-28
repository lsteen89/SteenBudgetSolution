using Backend.Application.DTO;
using Backend.Infrastructure.Security;
using Backend.Infrastructure.WebSockets;
using Backend.Tests.Helpers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Xunit;
using Backend.Application.DTO.User;
using Tests.Helpers;
using Newtonsoft.Json.Linq;
using Backend.Application.Interfaces.JWT;
using Serilog;
using Backend.Domain.Entities.User;
using Backend.Tests.Fixtures;
using Backend.Infrastructure.Entities.Tokens;

namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsLogout : IntegrationTestBase
    {
        public AuthServiceIntegrationTestsLogout(DatabaseFixture fixture)
    : base(fixture)
        {
        }

        [Fact]
        public async Task LogoutAsync_ValidUser_BlacklistsTokenAndNotifiesWebSocket()
        {
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            // Arrange - Create and confirm user
            var userCreationDto = new UserCreationDto
            {
                FirstName = "Test",
                LastName = "User",
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };

            var registeredUser = await SetupUserAsync(userCreationDto);
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            var loginResult = (await AuthService.LoginAsync(new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            },
                ipAddress, deviceId, userAgent))
                            .ShouldBeSuccess();

            var sessionId = loginResult.Access.SessionId;
            var accessToken = loginResult.Access.Token;
            var refreshToken = loginResult.RefreshToken;

            // Extract the JTI and sub from the freshly issued access token
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(accessToken);
            var jtiClaim = jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Jti);
            var subClaim = jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub);
            Assert.Equal(registeredUser.PersoId.ToString(), subClaim.Value);

            // Build the expected session key
            var expectedKey = new UserSessionKey(
                registeredUser.PersoId,
                sessionId
            );

            // Expect a LOGOUT message on that key
            WebSocketManagerMock
                .Setup(ws => ws.SendMessageAsync(expectedKey, "LOGOUT"))
                .Returns(Task.CompletedTask)
                .Verifiable();

            // Act - call the new LogoutAsync signature:
            await AuthService.LogoutAsync(
                accessToken,
                refreshToken,
                sessionId,
                logoutAllUsers: false
            );

            // Assert – token JTI was blacklisted
            var isBlacklisted = await TokenBlacklistService
                                    .IsTokenBlacklistedAsync(jtiClaim.Value);
            Assert.True(isBlacklisted, "Token should be blacklisted after logout.");

            // Assert – WebSocket was notified
            WebSocketManagerMock.Verify(
                ws => ws.SendMessageAsync(
                    It.Is<UserSessionKey>(k =>
                        k.Persoid == registeredUser.PersoId &&
                        k.SessionId == sessionId),
                    "LOGOUT"),
                Times.Once,
                "A 'LOGOUT' message should be sent via WebSocket."
            );

            // Assert – old token no longer valid
            var postLogoutPrincipal = jwtService.ValidateToken(accessToken);
            Assert.Null(postLogoutPrincipal);
        }

        [Fact]
        public async Task LogoutAsync_MissingSubClaim_LogsWarning()
        {
            // Arrange - Create and confirm user
            var userCreationDto = new UserCreationDto
            {
                FirstName = "Test",
                LastName = "User",
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };

            var registeredUser = await SetupUserAsync(userCreationDto);
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            var (ipAddress, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();

            // Act - Login to obtain JWT token
            var loginResult = (await AuthService.LoginAsync(
                new UserLoginDto
                {
                    Email = "test@example.com",
                    Password = "Password123!",
                    CaptchaToken = "mock-captcha-token"
                },
                ipAddress, deviceId, userAgent))
                            .ShouldBeSuccess();          // ⬅️ asserts & returns LoginOutcome.Success

            var sessionId = loginResult.Access.SessionId;
            var accessToken = loginResult.Access.Token;
            var refreshToken = loginResult.RefreshToken;

            var authToken = accessToken;
            Assert.False(string.IsNullOrEmpty(authToken), "Access token should not be null or empty.");


            // 1) Prepare the hash
            var providedHashedToken = TokenGenerator.HashToken(loginResult.RefreshToken);

            // 2) Fetch inside a tx and pull out the single token
            List<RefreshJwtTokenEntity> fetched;
            var (conn, tx) = await CreateTransactionAsync();
            try
            {
                fetched = (await UserSQLProvider
                    .RefreshTokenSqlExecutor
                    .GetRefreshTokensAsync(conn, tx, hashedToken: providedHashedToken))
                    .ToList();

                await tx.CommitAsync();
            }
            finally
            {
                await tx.DisposeAsync();
                await conn.DisposeAsync();
            }

            var storedToken = fetched.FirstOrDefault();
            Assert.NotNull(storedToken);   // sanity check

            // 3) Now you can call LogoutAsync, passing along storedToken.SessionId etc.
            await AuthService.LogoutAsync(
                accessToken,
                storedToken.HashedToken,
                storedToken.SessionId,
                logoutAllUsers: false
            );

            var expectedKey = new UserSessionKey(
                registeredUser.PersoId,   // Persoid (Guid)
                sessionId                 // SessionId (Guid)
            );
            // Expect a LOGOUT message on that key
            WebSocketManagerMock
           
               .Setup(ws => ws.SendMessageAsync(expectedKey, "LOGOUT"))
                .Returns(Task.CompletedTask)
                .Verifiable();


            // Assert – WebSocket was notified
             WebSocketManagerMock.Verify(

                        ws => ws.SendMessageAsync(
                        It.Is<UserSessionKey>(k =>
                        k.Persoid == registeredUser.PersoId &&
                        k.SessionId == sessionId),
                        "LOGOUT"),
            Times.Once);

            // Assert – old token no longer valid
            var postLogoutPrincipal = jwtService.ValidateToken(accessToken);
            Assert.Null(postLogoutPrincipal);
        }

        [Fact]
        public async Task LoginFromThreeDevices_LogoutBehavior_Test()
        {
            // Arrange ──────────────────────────────────────────────────────
            var (ipAddress, deviceId1, userAgent1) = AuthTestHelper.GetDefaultMetadata();
            var deviceId2 = "test-device-2";
            var userAgent2 = "Mozilla/5.0 (compatible; TestBrowser/2.0)";
            var deviceId3 = "test-device-3";
            var userAgent3 = "Mozilla/5.0 (compatible; TestBrowser/3.0)";

            var userLoginDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "valid-captcha-token"
            };

            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act – three logins ───────────────────────────────────────────
            var login1 = (await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId1, userAgent1))
                            .ShouldBeSuccess();
            var login2 = (await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId2, userAgent2))
                            .ShouldBeSuccess();
            var login3 = (await AuthService.LoginAsync(userLoginDto, ipAddress, deviceId3, userAgent3))
                            .ShouldBeSuccess();

            var tokensBefore = await TxGetTokensAsync(registeredUser.PersoId);
            Assert.Equal(3, tokensBefore.Count);

            // Validate tokens are all valid...

            // Step 1 — single‐session logout
            await AuthService.LogoutAsync(login1.Access.Token, login1.RefreshToken, login1.Access.SessionId, logoutAllUsers: false);

            var afterSingle = await TxGetTokensAsync(registeredUser.PersoId);
            Assert.Equal(2, afterSingle.Count);

            // Step 2 — global logout from session 2
            await AuthService.LogoutAsync(login2.Access.Token, login2.RefreshToken, login2.Access.SessionId, logoutAllUsers: true);

            var afterGlobal = await TxGetTokensAsync(registeredUser.PersoId);
            Assert.Empty(afterGlobal);

            // Verify WS pushes...
            WebSocketManagerMock.Verify(
                ws => ws.SendMessageAsync(
                    It.Is<UserSessionKey>(k =>
                        k.Persoid == registeredUser.PersoId &&
                        (k.SessionId == login1.Access.SessionId ||
                         k.SessionId == login2.Access.SessionId)),
                    "LOGOUT"),
                Times.Exactly(2));
        }

        [Fact]
        public async Task Logout_SingleAndGlobalLogout_ShouldManageRefreshTokensProperly()
        {
            // ── Arrange ──────────────────────────────────────────────────────────
            var (ipAddress, deviceId1, ua1) = AuthTestHelper.GetDefaultMetadata();
            var deviceId2 = "test-device-2";
            var ua2 = "Mozilla/5.0 (compatible; TestBrowser/2.0)";
            var deviceId3 = "test-device-3";
            var ua3 = "Mozilla/5.0 (compatible; TestBrowser/3.0)";

            var userDto = new UserLoginDto
            {
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };

            // create & confirm user
            var registered = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registered.PersoId);

            // ── Act: login from three devices ────────────────────────────────────
            var login1 = (await AuthService.LoginAsync(userDto, ipAddress, deviceId1, ua1))
                         .ShouldBeSuccess();
            var login2 = (await AuthService.LoginAsync(userDto, ipAddress, deviceId2, ua2))
                         .ShouldBeSuccess();
            var login3 = (await AuthService.LoginAsync(userDto, ipAddress, deviceId3, ua3))
                         .ShouldBeSuccess();

            // 1) Assert initial count = 3
            var before = await TxGetTokensAsync(registered.PersoId);
            Assert.Equal(3, before.Count);

            // 2) Single‐session logout
            await AuthService.LogoutAsync(
                login1.Access.Token, login1.RefreshToken, login1.Access.SessionId, false);

            var afterSingle = await TxGetTokensAsync(registered.PersoId);
            Assert.Equal(2, afterSingle.Count);

            // 3) Global logout from session-2
            await AuthService.LogoutAsync(
                login2.Access.Token, login2.RefreshToken, login2.Access.SessionId, true);

            var afterGlobal = await TxGetTokensAsync(registered.PersoId);
            Assert.Empty(afterGlobal);

            // 4) Token-blacklist sanity
            Assert.Null(jwtService.ValidateToken(login1.Access.Token));
        }
        private async Task<(UserModel usr, string AccessToken, string RefreshToken, Guid SessionId, string UserAgent, string DeviceId)> LoginHelperAsync()
        {
            var (ip, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
            var usr = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(usr.PersoId);

            var login = await AuthService.LoginAsync(
                new UserLoginDto { Email = usr.Email, Password = "Password123!", CaptchaToken = "tok" },
                ip, deviceId, userAgent);

            var tokens = login.ShouldBeSuccess();
            return (usr, tokens.Access.Token, tokens.RefreshToken, tokens.Access.SessionId, userAgent, deviceId);
        }
        async Task<List<RefreshJwtTokenEntity>> TxGetTokensAsync(Guid userId)
        {
            var (conn, tx) = await CreateTransactionAsync();
            try
            {
                var tokens = (await UserSQLProvider
                    .RefreshTokenSqlExecutor
                    .GetRefreshTokensAsync(conn, tx, userId))
                    .ToList();
                await tx.CommitAsync();
                return tokens;
            }
            finally
            {
                await conn.DisposeAsync();
            }
        }
    }
}
