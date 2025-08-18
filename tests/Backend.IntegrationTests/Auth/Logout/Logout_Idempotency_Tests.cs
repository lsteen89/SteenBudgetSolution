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
using Backend.Infrastructure.WebSockets;

namespace Backend.IntegrationTests.Auth.Logout;
[Collection("it:db")]
public sealed class Logout_Idempotency_Tests
{
    private readonly MariaDbFixture _db;
    public Logout_Idempotency_Tests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task Given_LogoutCalledTwice_When_SameSession_Then_SecondIsNoOp()
    {
        await _db.ResetAsync();

        var now = DateTime.UtcNow;
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(x => x.UtcNow).Returns(now);

        var userId = Guid.NewGuid();
        var sid = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
        INSERT INTO Users (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES (@pid, 'T','U','user@example.com', 1, 'hash', 'User', 0, 0, 'it');
        """, new { pid = userId });

        await conn.ExecuteAsync("""
        INSERT INTO RefreshTokens (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, CreatedUtc)
        VALUES (@tid, @pid, @sid, 'h', 'j', @roll, @abs, 1, 1, @now);
        """, new { tid = Guid.NewGuid(), pid = userId, sid, roll = now.AddDays(7), abs = now.AddDays(30), now });

        var repo = new SqlRefreshRepo(_db.ConnectionString);
        var jwt = new Mock<IJwtService>(); jwt.Setup(j => j.BlacklistJwtTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var ws = new Mock<IWebSocketManager>(); ws.Setup(w => w.SendMessageAsync(It.IsAny<UserSessionKey>(), "LOGOUT")).Returns(Task.CompletedTask);

        var sut = new LogoutHandler(repo, jwt.Object, clock.Object, ws.Object, Mock.Of<Microsoft.Extensions.Logging.ILogger<LogoutHandler>>());

        var at = CreateJwt(userId);
        var cmd = new LogoutCommand(at, null, sid, false, "UA", "dev");

        await sut.Handle(cmd, CancellationToken.None); // first
        await sut.Handle(cmd, CancellationToken.None); // second

        var row = await conn.QuerySingleAsync<(int Status, DateTime? Revoked)>("SELECT Status, RevokedUtc AS Revoked FROM RefreshTokens WHERE Persoid=@pid AND SessionId=@sid;",
            new { pid = userId, sid });

        row.Status.Should().Be(2);
        row.Revoked.Should().NotBeNull();
    }

    [Fact]
    public async Task Given_InvalidAccessToken_When_Logout_Then_NoChangesButSuccess()
    {
        await _db.ResetAsync();

        var now = DateTime.UtcNow;
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(x => x.UtcNow).Returns(now);

        var userId = Guid.NewGuid();
        var sid = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
        INSERT INTO Users (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES (@pid, 'T','U','user@example.com', 1, 'hash', 'User', 0, 0, 'it');
        """, new { pid = userId });

        await conn.ExecuteAsync("""
        INSERT INTO RefreshTokens (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, CreatedUtc)
        VALUES (@tid, @pid, @sid, 'h', 'j', @roll, @abs, 1, 1, @now);
        """, new { tid = Guid.NewGuid(), pid = userId, sid, roll = now.AddDays(7), abs = now.AddDays(30), now });

        var repo = new SqlRefreshRepo(_db.ConnectionString);
        var sut = new LogoutHandler(repo, Mock.Of<IJwtService>(), clock.Object, Mock.Of<IWebSocketManager>(), Mock.Of<Microsoft.Extensions.Logging.ILogger<LogoutHandler>>());

        var cmd = new LogoutCommand("this-is-not-a-jwt", null, sid, false, "UA", "dev");
        await sut.Handle(cmd, CancellationToken.None);

        var row = await conn.QuerySingleAsync<(int Status, DateTime? Revoked)>("SELECT Status, RevokedUtc AS Revoked FROM RefreshTokens WHERE Persoid=@pid AND SessionId=@sid;",
            new { pid = userId, sid });

        row.Status.Should().Be(1);
        row.Revoked.Should().BeNull();
    }

    private static string CreateJwt(Guid userId)
    {
        var jwt = new JwtSecurityToken(claims: new[] { new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()) },
                                       notBefore: DateTime.UtcNow.AddMinutes(-1),
                                       expires: DateTime.UtcNow.AddMinutes(5));
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private sealed class SqlRefreshRepo : IRefreshTokenRepository
    {
        private readonly string _cs; public SqlRefreshRepo(string cs) => _cs = cs;

        public async Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.ExecuteAsync("""
            UPDATE RefreshTokens SET RevokedUtc=@now, Status=2 WHERE Persoid=@pid AND SessionId=@sid AND RevokedUtc IS NULL;
            """, new { pid = persoId, sid = sessionId, now = nowUtc });
        }
        public async Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.ExecuteAsync("UPDATE RefreshTokens SET RevokedUtc=@now, Status=2 WHERE Persoid=@pid AND RevokedUtc IS NULL;",
                new { pid = persoid, now = nowUtc });
        }

        // Unused
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
