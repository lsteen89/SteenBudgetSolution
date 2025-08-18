using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Application.Features.Commands.Auth.Logout;
using Backend.IntegrationTests.Shared;
using Backend.Infrastructure.WebSockets; // UserSessionKey

namespace Backend.IntegrationTests.Auth.Logout;

[Collection("it:db")]
public sealed class LogoutIntegrationTests
{
    private readonly MariaDbFixture _db;
    public LogoutIntegrationTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task Given_ValidAT_When_LogoutSingle_Then_OnlyThatSessionRevoked()
    {
        await _db.ResetAsync();
        var now = new DateTime(2025, 2, 3, 10, 0, 0, DateTimeKind.Utc);
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(x => x.UtcNow).Returns(now);

        var userId = Guid.NewGuid();
        var s1 = Guid.NewGuid();
        var s2 = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        // Seed user + two active sessions
        await conn.ExecuteAsync("""
        INSERT INTO Users
          (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES
          (@pid, 'Test', 'User', 'user@example.com', 1, 'hash', 'User', 0, 0, 'it');
        """, new { pid = userId });

        await conn.ExecuteAsync("""
        INSERT INTO RefreshTokens (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, DeviceId, UserAgent, CreatedUtc)
        VALUES (@tid1, @pid, @sid1, 'h1', 'j1', @roll, @abs, 1, 1, 'dev', 'UA', @now),
               (@tid2, @pid, @sid2, 'h2', 'j2', @roll, @abs, 1, 1, 'dev', 'UA', @now);
        """, new { tid1 = Guid.NewGuid(), tid2 = Guid.NewGuid(), pid = userId, sid1 = s1, sid2 = s2, roll = now.AddDays(7), abs = now.AddDays(30), now });

        var refresh = new SqlRefreshRepo(_db.ConnectionString);

        var jwt = new Mock<IJwtService>();
        jwt.Setup(j => j.BlacklistJwtTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true).Verifiable();

        var ws = new Mock<IWebSocketManager>();
        ws.Setup(w => w.SendMessageAsync(It.IsAny<UserSessionKey>(), "LOGOUT")).Returns(Task.CompletedTask).Verifiable();

        var sut = new LogoutHandler(refresh, jwt.Object, clock.Object, ws.Object,
            Mock.Of<Microsoft.Extensions.Logging.ILogger<LogoutHandler>>());

        var accessToken = CreateJwtForUser(userId); // sub=PersoId

        var cmd = new LogoutCommand(
            AccessToken: accessToken,
            RefreshCookie: null,
            SessionId: s1,
            LogoutAll: false,
            UserAgent: "UA",
            DeviceId: "dev"
        );

        await sut.Handle(cmd, CancellationToken.None);

        // Assert: only s1 revoked
        var rows = await conn.QueryAsync<(Guid Sid, int Status, DateTime? Revoked)>(
            "SELECT SessionId AS Sid, Status, RevokedUtc AS Revoked FROM RefreshTokens WHERE Persoid=@pid ORDER BY CreatedUtc;",
            new { pid = userId });

        var r1 = rows.AsList()[0];
        var r2 = rows.AsList()[1];

        (r1.Sid == s1 ? r1.Status : r2.Status).Should().Be(2);
        (r1.Sid == s1 ? r1.Revoked : r2.Revoked).Should().NotBeNull();

        (r1.Sid == s1 ? r2.Status : r1.Status).Should().Be(1);
        (r1.Sid == s1 ? r2.Revoked : r1.Revoked).Should().BeNull();

        jwt.Verify(j => j.BlacklistJwtTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        ws.Verify(w => w.SendMessageAsync(It.IsAny<UserSessionKey>(), "LOGOUT"), Times.Once);
    }

    [Fact]
    public async Task Given_ValidAT_When_LogoutAll_Then_AllSessionsRevoked()
    {
        await _db.ResetAsync();
        var now = new DateTime(2025, 2, 3, 10, 30, 0, DateTimeKind.Utc);
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(x => x.UtcNow).Returns(now);

        var userId = Guid.NewGuid();
        var s1 = Guid.NewGuid();
        var s2 = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
        INSERT INTO Users
          (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES
          (@pid, 'Test', 'User', 'user@example.com', 1, 'hash', 'User', 0, 0, 'it');
        """, new { pid = userId });

        await conn.ExecuteAsync("""
        INSERT INTO RefreshTokens (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, DeviceId, UserAgent, CreatedUtc)
        VALUES (@tid1, @pid, @sid1, 'h1', 'j1', @roll, @abs, 1, 1, 'dev', 'UA', @now),
               (@tid2, @pid, @sid2, 'h2', 'j2', @roll, @abs, 1, 1, 'dev', 'UA', @now);
        """, new { tid1 = Guid.NewGuid(), tid2 = Guid.NewGuid(), pid = userId, sid1 = s1, sid2 = s2, roll = now.AddDays(7), abs = now.AddDays(30), now });

        var refresh = new SqlRefreshRepo(_db.ConnectionString);

        var jwt = new Mock<IJwtService>();
        jwt.Setup(j => j.BlacklistJwtTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var ws = new Mock<IWebSocketManager>();
        ws.Setup(w => w.SendMessageAsync(It.IsAny<UserSessionKey>(), "LOGOUT")).Returns(Task.CompletedTask);

        var sut = new LogoutHandler(refresh, jwt.Object, clock.Object, ws.Object,
            Mock.Of<Microsoft.Extensions.Logging.ILogger<LogoutHandler>>());

        var accessToken = CreateJwtForUser(userId);

        var cmd = new LogoutCommand(
            AccessToken: accessToken,
            RefreshCookie: null,
            SessionId: s1,   // ignored when LogoutAll=true
            LogoutAll: true,
            UserAgent: "UA",
            DeviceId: "dev"
        );

        await sut.Handle(cmd, CancellationToken.None);

        var rows = await conn.QueryAsync<(int Status, DateTime? Revoked)>(
            "SELECT Status, RevokedUtc AS Revoked FROM RefreshTokens WHERE Persoid=@pid;",
            new { pid = userId });

        foreach (var r in rows)
        {
            r.Status.Should().Be(2);
            r.Revoked.Should().NotBeNull();
        }
    }

    // --- helpers / repo shim ---

    private static string CreateJwtForUser(Guid userId)
    {
        var jwt = new JwtSecurityToken(
            claims: new[] {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            },
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddMinutes(5)
        );
        return new JwtSecurityTokenHandler().WriteToken(jwt); // no signature required for TokenHelper.ReadJwtToken
    }

    private sealed class SqlRefreshRepo : IRefreshTokenRepository
    {
        private readonly string _cs; public SqlRefreshRepo(string cs) => _cs = cs;

        public async Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.ExecuteAsync("""
            UPDATE RefreshTokens
               SET RevokedUtc = @now, Status = 2
             WHERE Persoid = @pid AND SessionId = @sid AND RevokedUtc IS NULL;
            """, new { pid = persoId, sid = sessionId, now = nowUtc });
        }

        public async Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.ExecuteAsync("""
            UPDATE RefreshTokens
               SET RevokedUtc = @now, Status = 2
             WHERE Persoid = @pid AND RevokedUtc IS NULL;
            """, new { pid = persoid, now = nowUtc });
        }

        // Unused members
        public Task<int> InsertAsync(Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity row, CancellationToken ct) => Task.FromResult(0);
        public Task<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct) => Task.FromResult<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?>(null);
        public Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize, CancellationToken ct) => 
            Task.FromResult(Enumerable.Empty<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>());
        public Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct) => Task.FromResult(false);
    }
}
