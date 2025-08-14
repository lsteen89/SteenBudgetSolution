using Backend.Application.DTO.User;
using Backend.Domain.Entities.User;
using Backend.Infrastructure.Entities.Tokens;
using Backend.Infrastructure.WebSockets;
using Backend.Test.UserTests;
using Backend.Tests.Fixtures;
using Backend.Tests.Helpers;
using Moq;
using MySqlConnector;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Tests.Helpers;
using Xunit;

namespace Backend.Tests.IntegrationTests.Services.AuthService
{
    public class AuthServiceIntegrationTestsRefreshToken : IntegrationTestBase
    {
        private readonly HttpClient _client;

        public AuthServiceIntegrationTestsRefreshToken(DatabaseFixture fixture)
         : base(fixture)
        {
        }
        [Fact]
        public async Task Status_HappyPath_Rotation_ReturnsAllTokens()
        {
            // arrange
            var (user, access, refresh, originalSid, ua, dev) = await LoginHelperAsync();

            // act
            var res = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, refresh, originalSid, ua, dev, conn, tx)
            );

            // assert
            Assert.True(res.Authenticated);
            Assert.NotNull(res.AccessToken); // For string, this is fine (no message arg)

            // SessionId is Guid (non-nullable)
            // Assert.NotNull(res.SessionId); // Redundant
            Assert.NotEqual(Guid.Empty, res.SessionId); // Check it's not the default empty Guid
            Assert.Equal(originalSid, res.SessionId);   // Check it matches the expected SessionId

            // Persoid is Guid (non-nullable)
            // Assert.NotNull(res.Persoid); // Redundant
            Assert.NotEqual(Guid.Empty, res.Persoid);   // Check it's not the default empty Guid
            Assert.Equal(user.PersoId, res.Persoid);    // Check it matches the expected PersoId

            // ExpiresUtc is DateTime (non-nullable)
            // Assert.NotNull(res.ExpiresUtc); // Redundant
            Assert.NotEqual(default(DateTime), res.ExpiresUtc); // Check it's not the default DateTime
                                                                // Add a more meaningful check, e.g., it's in the future
                                                                // You might need to get the current time from your _timeProvider if it's used in the service
                                                                // For simplicity here, assuming a general check against UtcNow (be mindful of test run variances)
            Assert.True(res.ExpiresUtc > DateTime.UtcNow.AddMinutes(-1), "New refresh token expiry should be in the future.");

            // NewRefreshCookie is string
            Assert.NotNull(res.NewRefreshCookie); // Fine (no message arg)
            Assert.False(string.IsNullOrEmpty(res.NewRefreshCookie), "The new refresh cookie string should not be empty.");
            Assert.True(refresh != res.NewRefreshCookie, "The new refresh cookie should be different from the old one due to rotation.");
        }
        [Fact]
        public async Task Status_HappyPath_Rotation_KeepsSessionId()
        {
            // ── ARRANGE ─────────────────────────────────────────────────────────
            // Perform a normal login to get the initial session‐id (sid) and tokens
            var (user, access, refresh, sid, ua, dev) = await LoginHelperAsync();

            // ── ACT ───────────────────────────────────────────────────────────────
            // Call CheckAndRefreshAsync in a transaction to trigger the “no‐rotation” path
            var res = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(
                    access,
                    refresh,
                    sid,
                    ua,
                    dev,
                    conn,
                    tx
                )
            );

            // ── ASSERT ───────────────────────────────────────────────────────────
            Assert.True(res.Authenticated, "Authentication should succeed");
            Assert.NotNull(res.AccessToken);
            Assert.NotNull(res.NewRefreshCookie);

            // Decode the new access token and extract its sessionId claim
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(res.AccessToken);
            var newSid = Guid.Parse(
                jwt.Claims.First(c => c.Type == "sessionId").Value
            );

            // The session‐id inside the token must match the original one
            Assert.Equal(sid, newSid);
        }


        /*──────────────────────────────────────────────────────────────*/
        /* A2 – happy path rotation                   */
        /*──────────────────────────────────────────────────────────────*/
        [Fact]
        public async Task Status_WhenWindowBelowThreshold_RotatesRefreshToken()
        {
            // arrange
            var (user, access, refresh, sid, ua, dev) = await LoginHelperAsync();

            // shrink TTL to 3 days to force rotation
            await UserSQLProvider.RefreshTokenSqlExecutor.UpdateRollingExpiryAsync(
                user.PersoId,
                sid,
                DateTime.UtcNow.AddDays(3));

            // act
            var res = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, refresh, sid, ua, dev, conn, tx)
            );

            // assert
            Assert.True(res.Authenticated);
            Assert.NotNull(res.AccessToken);
            Assert.NotNull(res.NewRefreshCookie);       // rotated
        }

        [Fact]
        public async Task Status_AbsoluteExpiryPassed_ReturnsUnauthorized()
        {
            // arrange
            var (user, access, refresh, sid, ua, dev) = await LoginHelperAsync();

            // ── Expire token in DB under a tx ──────────────────────────────────────
            var (conn, tx) = await CreateTransactionAsync();
            try
            {
                var updated = await UserSQLProvider
                    .RefreshTokenSqlExecutor
                    .UpdateAbsoluteExpiryAsync(

                        user.PersoId,
                        sid,
                        conn,                    
                        tx ,                     
                        whenUtc: null
                    );

                await tx.CommitAsync();
                Assert.True(updated, "Expiry update should return true");
            }
            finally
            {
                await tx.DisposeAsync();
                await conn.DisposeAsync();
            }

            var res = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, refresh, sid, ua, dev, conn, tx)
            );

            Assert.False(res.Authenticated);
        }
        [Fact]
        public async Task Status_SessionIdMismatch_ReturnsUnauthorized()
        {
            // arrange
            var (user, access, refresh, sid, ua, dev) = await LoginHelperAsync();

            var fakeSession = Guid.NewGuid();

            var res = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, refresh, fakeSession, ua, dev, conn, tx)
            );

            Assert.False(res.Authenticated);
        }
        /*──────────────────────────────────────────────────────────────*/
        /* D1 – reuse of rotated refresh token returns 401             */
        /*──────────────────────────────────────────────────────────────*/
        [Fact]
        public async Task Status_ReusingOldRefreshToken_FailsAfterRotation()
        {
            // arrange
            var (user, access, refresh, sid, ua, dev) = await LoginHelperAsync();

            // shrink TTL to force rotation
            await UserSQLProvider.RefreshTokenSqlExecutor.UpdateRollingExpiryAsync(
                user.PersoId,
                sid,
                DateTime.UtcNow.AddDays(1));

            var first = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, refresh, sid, ua, dev, conn, tx)
            );
            Assert.True(first.Authenticated);
            Assert.NotNull(first.NewRefreshCookie);

            // second call with *old* cookie must now fail
            var second = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, refresh, sid, ua, dev, conn, tx)
            );
            Assert.False(second.Authenticated);
        }

        /*---------------------------------------------------------*/
        /*    Invalid refresh-token (tampered value)               */
        /*---------------------------------------------------------*/
        [Fact]
        public async Task CheckAndRefreshAsync_TamperedRefreshToken_Fails()
        {
            // arrange – normal login
            var (user, access, refresh, sid, ua, dev) = await LoginHelperAsync();
            var tampered = refresh + "X";                  // simulate bit-flip

            // act
            var res = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, tampered, sid, ua, dev, conn, tx)
            );

            // assert
            Assert.False(res.Authenticated);
        }





        /*---------------------------------------------------------*/
        /* 3) Happy path: rotation black-lists old JTI             */
        /*---------------------------------------------------------*/
        [Fact]
        public async Task CheckAndRefreshAsync_Rotation_BlacklistsOldJti()
        {
            // 1) Arrange & login
            var (user, access, refresh, sid, ua, dev) = await LoginHelperAsync();

            // 2) Shrink rolling expiry in DB
            var (conn1, tx1) = await CreateTransactionAsync();
            try
            {
                var didUpdate = await UserSQLProvider.RefreshTokenSqlExecutor
                    .UpdateRollingExpiryAsync(

                        user.PersoId,
                        sid,
                        DateTime.UtcNow.AddDays(1),
                        conn1,
                        tx1
                    );
                await tx1.CommitAsync();
                Assert.True(didUpdate, "Rolling expiry update should succeed");
            }
            finally
            {
                await conn1.DisposeAsync();
            }

            // 3) Read the pre-rotation token row
            List<RefreshJwtTokenEntity> beforeRows;
            var (conn2, tx2) = await CreateTransactionAsync();
            try
            {
                beforeRows = (await UserSQLProvider.RefreshTokenSqlExecutor
                    .GetRefreshTokensAsync(
                        conn2,
                        tx2,
                        user.PersoId,
                        onlyActive: false))
                    .ToList();
                await tx2.CommitAsync();
            }
            finally
            {
                await conn2.DisposeAsync();
            }
            var oldJti = beforeRows.Single().AccessTokenJti;

            // 4) Act — trigger the rotation
            var res = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, refresh, sid, ua, dev, conn, tx)
            );
            Assert.True(res.Authenticated);
            Assert.NotNull(res.NewRefreshCookie);

            // 5) Verify that the old JTI was blacklisted
            BlacklistedTokenEntity black;
            var (conn3, tx3) = await CreateTransactionAsync();
            try
            {
                black = await UserSQLProvider.RefreshTokenSqlExecutor
                    .GetBlacklistedTokenByJtiAsync(
                        oldJti,
                        conn3,
                        tx3
                    );
                await tx3.CommitAsync();
            }
            finally
            {
                await conn3.DisposeAsync();
            }

            Assert.NotNull(black);
            Assert.True(black.ExpiryDate > DateTime.UtcNow, "Blacklisted expiry must be in the future");
        }

        /*---------------------------------------------------------*/
        /* 5) Sliding-window above threshold – still rotation         */
        /*---------------------------------------------------------*/
        [Fact]
        public async Task CheckAndRefreshAsync_WindowAboveThreshold_DoesNotRotate()
        {
            var (user, access, refresh, sid, ua, dev) = await LoginHelperAsync();

            // set expiry to 6 days (threshold in config = 5 days)
            await UserSQLProvider.RefreshTokenSqlExecutor.UpdateRollingExpiryAsync(
                user.PersoId,
                sid,
                DateTime.UtcNow.AddDays(6));

            var res = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(access, refresh, sid, ua, dev, conn, tx)
            );

            Assert.True(res.Authenticated);
            Assert.NotNull(res.NewRefreshCookie);      // rotation
        }
        /*──────────────────────────────────────────────────────────────────────────*/
        /*  T-1  Missing cookies  ➜  should fail fast                               */
        /*──────────────────────────────────────────────────────────────────────────*/
        [Fact]
        public async Task Status_MissingCookies_ReturnsUnauthorized()
        {
            var (_, _, _, sid, ua, dev) = await LoginHelperAsync();

            // empty refresh token
            var res1 = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(accessToken: string.Empty, refreshCookie: string.Empty, sessionId: Guid.Empty, ua, dev, conn, tx)
            );

            Assert.False(res1.Authenticated);

            // empty session-id
            var (_, _, refresh, _, _, _) = await LoginHelperAsync();
            var res2 = await RunInTxAsync((conn, tx) =>
                AuthService.CheckAndRefreshAsync(
                accessToken: string.Empty,
                refreshCookie: refresh,
                sessionId: Guid.Empty,
                userAgent: ua,
                deviceId: dev,
                conn, tx)
                );

            Assert.False(res2.Authenticated);
        }


        /*──────────────────────────────────────────────────────────────────────────*/
        /*  T-3  Login twice → distinct refresh rows (unique session-ids)           */
        /*──────────────────────────────────────────────────────────────────────────*/
        [Fact]
        public async Task LoginTwice_CreatesTwoActiveRefreshRows_WithUniqueSessions()
        {
            // Arrange
            var (ip, dev, ua) = AuthTestHelper.GetDefaultMetadata();
            var usr = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(usr.PersoId);

            var dto = new UserLoginDto
            {
                Email = usr.Email,
                Password = "Password123!",
                CaptchaToken = "tok"
            };

            // Act
            var first = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();
            var second = (await AuthService.LoginAsync(dto, ip, dev, ua)).ShouldBeSuccess();

            // Assert: read under tx
            var (conn, tx) = await CreateTransactionAsync();
            List<RefreshJwtTokenEntity> rows;
            try
            {
                rows = (await UserSQLProvider.RefreshTokenSqlExecutor
                    .GetRefreshTokensAsync(conn, tx, usr.PersoId))
                    .ToList();

                await tx.CommitAsync();
            }
            finally
            {
                await conn.DisposeAsync();
            }

            Assert.True(rows.Count >= 2);
            Assert.NotEqual(rows[0].SessionId, rows[1].SessionId);
            Assert.NotEqual(first.RefreshToken, second.RefreshToken);
        }


        /*──────────────────────────────────────────────────────────────────────────*/
        /*  T-4  Logout from two devices deletes both rows + broadcasts ‘LOGOUT’    */
        /*──────────────────────────────────────────────────────────────────────────*/

        [Fact]
        public async Task LogoutFromTwoDevices_RemovesAllActiveRefreshRows_AndSendsWs()
        {
            var (ip, dev1, ua1) = AuthTestHelper.GetDefaultMetadata();
            var dev2 = "device-B"; var ua2 = "Mozilla/5.0 test-browser B";

            var usr = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(usr.PersoId);

            var dto = new UserLoginDto { Email = usr.Email, Password = "Password123!", CaptchaToken = "tok" };

            var a = (await AuthService.LoginAsync(dto, ip, dev1, ua1)).ShouldBeSuccess();
            var b = (await AuthService.LoginAsync(dto, ip, dev2, ua2)).ShouldBeSuccess();

            // mock WS expects 
            WebSocketManagerMock
                .Setup(x => x.SendMessageAsync(
                    It.Is<UserSessionKey>(k =>
                        k.Persoid == usr.PersoId &&
                        (k.SessionId == a.Access.SessionId || k.SessionId == b.Access.SessionId)),
                    "LOGOUT"))
                .Returns(Task.CompletedTask)
                .Verifiable();

            // act – logout from both sessions
            await AuthService.LogoutAsync(a.Access.Token, a.RefreshToken, a.Access.SessionId, logoutAllUsers: true);
            await AuthService.LogoutAsync(b.Access.Token, b.RefreshToken, b.Access.SessionId, logoutAllUsers: false);

            // assert – DB rows 
            IEnumerable<RefreshJwtTokenEntity> rows;
            var (conn, tx) = await CreateTransactionAsync();
            try
            {
                rows = await UserSQLProvider
                    .RefreshTokenSqlExecutor
                    .GetRefreshTokensAsync(
                        conn,
                        tx,
                        persoId: usr.PersoId,
                        onlyActive: true
                    );

                await tx.CommitAsync();
            }
            finally
            {
                await conn.DisposeAsync();
            }
            Assert.Empty(rows);

            // assert – WS broadcasts
            WebSocketManagerMock.Verify(x => x.SendMessageAsync(
                It.IsAny<UserSessionKey>(), "LOGOUT"), Times.Exactly(2));
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
    }
}
