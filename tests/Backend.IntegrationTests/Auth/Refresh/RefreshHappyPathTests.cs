using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Common.Security;
using Backend.Application.Features.Commands.Auth.RefreshToken;
using Backend.Domain.Users;
using Backend.IntegrationTests.Shared;
using Backend.Infrastructure.Security; // TokenGenerator
using Backend.Settings;

namespace Backend.IntegrationTests.Auth.Refresh;

[Collection("it:db")]
public sealed class RefreshHappyPathTests
{
    private readonly MariaDbFixture _db;
    public RefreshHappyPathTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task Given_ValidCookie_When_Refresh_Then_Rotates_ClampsRolling_And_BlacklistsOldAT()
    {
        await _db.ResetAsync();

        var now = new DateTime(2025, 2, 3, 09, 0, 0, DateTimeKind.Utc);

        var clock = new Mock<ITimeProvider>();
        clock.SetupGet(x => x.UtcNow).Returns(now);

        var sessionId = Guid.NewGuid();
        var userId    = Guid.NewGuid();

        // Seed: user + current refresh row
        var cookiePlain = "rc1";
        var cookieHash  = TokenGenerator.HashToken(cookiePlain);

        var currentJti  = "old-jti";
        var newJti      = "new-jti";

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
        INSERT INTO Users
          (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES
          (@pid, 'Test', 'User', 'user@example.com', 1, 'hash', 'User', 0, 0, 'it');
        """, new { pid = userId });

        // Absolute = now+10d; rolling currently now+2d
        await conn.ExecuteAsync("""
        INSERT INTO RefreshTokens
          (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, DeviceId, UserAgent, CreatedUtc)
        VALUES
          (@tid, @pid, @sid, @hash, @jti, @roll, @abs, 1, 1, 'dev', 'UA', @now);
        """, new {
            tid = Guid.NewGuid(),
            pid = userId,
            sid = sessionId,
            hash = cookieHash,
            jti  = currentJti,
            roll = now.AddDays(2),
            abs  = now.AddDays(10),
            now
        });

        // SQL-backed shims
        var refreshRepo = new SqlRefreshRepo(_db.ConnectionString);
        var userRepo    = new SqlUserRepo(_db.ConnectionString);

        // JWT: make new AT + one new RT
        var jwt = new Mock<IJwtService>();
        jwt.Setup(j => j.CreateAccessToken(userId, "user@example.com", It.IsAny<IReadOnlyList<string>>(), "dev", "UA", sessionId))
           .Returns(new AccessTokenResult("new.at", newJti, sessionId, userId, now.AddMinutes(15)));
        jwt.Setup(j => j.CreateRefreshToken()).Returns("new-rt");
        jwt.Setup(j => j.BlacklistJwtTokenAsync("oldAT", It.IsAny<CancellationToken>())).ReturnsAsync(true).Verifiable();

        var sut = new RefreshTokensCommandHandler(
            uow: Mock.Of<IUnitOfWork>(),
            refreshRepo, userRepo, jwt.Object, clock.Object,
            // Set rolling 30d so it MUST clamp to absolute (now+10d)
            Options.Create(new JwtSettings { RefreshTokenExpiryDays = 30, RefreshTokenExpiryDaysAbsolute = 90 }),
            Options.Create(new WebSocketSettings { Secret = "ws" }),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<RefreshTokensCommandHandler>>()
        );

        var cmd = new RefreshTokensCommand(
            AccessToken: "oldAT",              // should be blacklisted
            RefreshCookie: cookiePlain,        // plaintext cookie; handler hashes it
            SessionId: sessionId,
            UserAgent: "UA",
            DeviceId: "dev"
        );

        var result = await sut.Handle(cmd, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        // 1) Blacklist called
        jwt.Verify(j => j.BlacklistJwtTokenAsync("oldAT", It.IsAny<CancellationToken>()), Times.Once);

        // 2) Row rotated in-place with new values
        var row = await conn.QuerySingleAsync<DbRow>(@"
            SELECT TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc
            FROM RefreshTokens WHERE Persoid=@pid AND SessionId=@sid LIMIT 1;",
            new { pid = userId, sid = sessionId });

        // new hash matches returned plain RT
        TokenGenerator.HashToken(result.Value.RefreshToken).Should().Be(row.HashedToken);

        // AccessTokenJti updated
        row.AccessTokenJti.Should().Be(newJti);

        // 3) Rolling clamped to absolute (absolute was now+10d; rolling window requested 30d)
        var expectedRolling = now.AddDays(10);
        row.ExpiresRollingUtc.Should().BeCloseTo(expectedRolling, TimeSpan.FromSeconds(1));
        row.ExpiresAbsoluteUtc.Should().BeCloseTo(now.AddDays(10), TimeSpan.FromSeconds(1));
    }

    private sealed record DbRow(Guid TokenId, Guid Persoid, Guid SessionId, string HashedToken, string AccessTokenJti, DateTime ExpiresRollingUtc, DateTime ExpiresAbsoluteUtc);

    // ---- SQL repo shims (Binary16-friendly, no BIN/UUID funcs) ----

    private sealed class SqlRefreshRepo : IRefreshTokenRepository
    {
        private readonly string _cs;
        public SqlRefreshRepo(string cs) => _cs = cs;

        public async Task<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.QuerySingleOrDefaultAsync<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>(
                """
                SELECT TokenId, Persoid, SessionId, HashedToken, AccessTokenJti,
                       DeviceId, UserAgent, ExpiresRollingUtc, ExpiresAbsoluteUtc,
                       Status, IsPersistent, CreatedUtc, RevokedUtc
                  FROM RefreshTokens
                 WHERE SessionId = @sid
                   AND HashedToken = @hash
                   AND Status = @Active
                   AND RevokedUtc IS NULL
                   AND ExpiresAbsoluteUtc >= @now
                   AND ExpiresRollingUtc  >= @now
                 LIMIT 1
                 FOR UPDATE;
                """,
                new { sid = sessionId, hash = cookieHash, now = nowUtc, Active = 1 });
        }

        public async Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.ExecuteAsync("""
                UPDATE RefreshTokens
                   SET HashedToken = @NewHash,
                       AccessTokenJti = @NewJti,
                       ExpiresRollingUtc = @NewRolling
                 WHERE TokenId = @Id
                   AND HashedToken = @OldHash
                   AND Status = @Active;
                """, new { Id = tokenId, OldHash = oldHash, NewHash = newHash, NewJti = newAccessJti, NewRolling = newRollingUtc, Active = 1 });
        }

        // unused for this test
        public Task<int> InsertAsync(Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity row, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize = 1000, CancellationToken ct = default) => Task.FromResult(Enumerable.Empty<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>());
        public Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct) => Task.FromResult(false);
    }

    private sealed class SqlUserRepo : IUserRepository
    {
        private readonly string _cs;
        public SqlUserRepo(string cs) => _cs = cs;

        public async Task<Backend.Domain.Entities.User.UserModel?> GetUserModelAsync(Guid? persoid = null, string? email = null, CancellationToken ct = default)
        {
            await using var c = new MySqlConnection(_cs);
            if (persoid is not null)
                return await c.QuerySingleOrDefaultAsync<Backend.Domain.Entities.User.UserModel>(
                    "SELECT Id, Persoid AS PersoId, Email, Password, EmailConfirmed FROM Users WHERE Persoid=@id LIMIT 1;", new { id = persoid });
            if (email is not null)
                return await c.QuerySingleOrDefaultAsync<Backend.Domain.Entities.User.UserModel>(
                    "SELECT Id, Persoid AS PersoId, Email, Password, EmailConfirmed FROM Users WHERE Email=@eml LIMIT 1;", new { eml = email });
            return null;
        }

        // unused
        public Task<bool> UserExistsAsync(string email, CancellationToken ct) => Task.FromResult(false);
        public Task<bool> CreateUserAsync(Backend.Domain.Entities.User.UserModel user, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct) => Task.FromResult(true);
    }
}
