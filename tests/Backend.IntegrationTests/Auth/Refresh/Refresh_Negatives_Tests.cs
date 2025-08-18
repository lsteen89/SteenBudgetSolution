using System;
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
using Backend.Domain.Shared;
using Backend.IntegrationTests.Shared;
using Backend.Infrastructure.Security;
using Backend.Settings;

namespace Backend.IntegrationTests.Auth.Refresh;
[Collection("it:db")]
public sealed class Refresh_Negatives_Tests
{
    private readonly MariaDbFixture _db;
    public Refresh_Negatives_Tests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task Given_MissingOrInvalidCookie_When_Refresh_Then_InvalidRefreshToken()
    {
        await _db.ResetAsync();
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(x => x.UtcNow).Returns(DateTime.UtcNow);

        var sut = new RefreshTokensCommandHandler(
            Mock.Of<IUnitOfWork>(),
            refreshRepo: new SqlRefreshRepo(_db.ConnectionString),
            userRepo: new SqlUserRepo(_db.ConnectionString),
            jwt: Mock.Of<IJwtService>(),
            clock: clock.Object,
            Options.Create(new JwtSettings { RefreshTokenExpiryDays = 7, RefreshTokenExpiryDaysAbsolute = 30 }),
            Options.Create(new WebSocketSettings { Secret = "ws" }),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<RefreshTokensCommandHandler>>()
        );

        // missing cookie
        var r1 = await sut.Handle(new RefreshTokensCommand(null, "", Guid.NewGuid(), "UA", "dev"), CancellationToken.None);
        r1.IsSuccess.Should().BeFalse();
        r1.Error.Should().Be(UserErrors.InvalidRefreshToken);

        // no matching row (invalid cookie)
        var r2 = await sut.Handle(new RefreshTokensCommand(null, "nope", Guid.NewGuid(), "UA", "dev"), CancellationToken.None);
        r2.IsSuccess.Should().BeFalse();
        r2.Error.Should().Be(UserErrors.InvalidRefreshToken);
    }

    [Fact]
    public async Task Given_ExpiredAbsolute_When_Refresh_Then_InvalidRefreshToken()
    {
        await _db.ResetAsync();

        var now = new DateTime(2025, 2, 4, 12, 0, 0, DateTimeKind.Utc);
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(x => x.UtcNow).Returns(now);

        var userId = Guid.NewGuid();
        var sid = Guid.NewGuid();
        var cookie = "rc";
        var hash = TokenGenerator.HashToken(cookie);

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.ExecuteAsync("""
        INSERT INTO Users (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES (@pid, 'T','U','user@example.com', 1, 'hash', 'User', 0, 0, 'it');
        """, new { pid = userId });

        await conn.ExecuteAsync("""
        INSERT INTO RefreshTokens (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, CreatedUtc)
        VALUES (@tid, @pid, @sid, @hash, 'j', @roll, @abs, 1, 1, @now);
        """, new { tid = Guid.NewGuid(), pid = userId, sid, hash, roll = now.AddDays(1), abs = now.AddDays(-1), now });

        var jwt = new Mock<IJwtService>();
        var sut = new RefreshTokensCommandHandler(
            Mock.Of<IUnitOfWork>(),
            refreshRepo: new SqlRefreshRepo(_db.ConnectionString),
            userRepo: new SqlUserRepo(_db.ConnectionString),
            jwt: jwt.Object,
            clock: clock.Object,
            Options.Create(new JwtSettings { RefreshTokenExpiryDays = 7, RefreshTokenExpiryDaysAbsolute = 30 }),
            Options.Create(new WebSocketSettings { Secret = "ws" }),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<RefreshTokensCommandHandler>>()
        );

        var res = await sut.Handle(new RefreshTokensCommand(null, cookie, sid, "UA", "dev"), CancellationToken.None);
        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidRefreshToken);
    }

    [Fact]
    public async Task Given_RotateCollision1062_When_Refresh_Then_RetryAndSucceed()
    {
        await _db.ResetAsync();

        var now = new DateTime(2025, 2, 4, 12, 0, 0, DateTimeKind.Utc);
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(x => x.UtcNow).Returns(now);

        var userId = Guid.NewGuid();
        var sid = Guid.NewGuid();
        var cookie = "rc";
        var hash = TokenGenerator.HashToken(cookie);

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.ExecuteAsync("""
        INSERT INTO Users (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES (@pid, 'T','U','user@example.com', 1, 'hash', 'User', 0, 0, 'it');
        """, new { pid = userId });

        // active row to rotate
        await conn.ExecuteAsync("""
        INSERT INTO RefreshTokens (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, CreatedUtc)
        VALUES (@tid, @pid, @sid, @hash, 'oldJti', @roll, @abs, 1, 1, @now);
        """, new { tid = Guid.NewGuid(), pid = userId, sid, hash, roll = now.AddDays(2), abs = now.AddDays(10), now });

        // pre-seed another row with the would-be new hash(newRt1) to force UK_Hashed collision
        var newRt1 = "collide";
        var newRt1Hash = TokenGenerator.HashToken(newRt1);
        await conn.ExecuteAsync("""
        INSERT INTO RefreshTokens (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, CreatedUtc)
        VALUES (@tid, @pid, @sid, @hash, 'x', @roll, @abs, 1, 1, @now);
        """, new { tid = Guid.NewGuid(), pid = userId, sid = Guid.NewGuid(), hash = newRt1Hash, roll = now.AddDays(3), abs = now.AddDays(10), now });

        var jwt = new Mock<IJwtService>();
        jwt.Setup(j => j.CreateAccessToken(userId, "user@example.com", It.IsAny<IReadOnlyList<string>>(), "dev", "UA", sid))
           .Returns(new AccessTokenResult("new.at", Guid.NewGuid().ToString(), sid, userId, now.AddMinutes(15)));
        jwt.SetupSequence(j => j.CreateRefreshToken()).Returns(newRt1).Returns("ok-after-retry");

        var sut = new RefreshTokensCommandHandler(
            Mock.Of<IUnitOfWork>(),
            refreshRepo: new SqlRefreshRepo(_db.ConnectionString),
            userRepo: new SqlUserRepo(_db.ConnectionString),
            jwt: jwt.Object,
            clock: clock.Object,
            Options.Create(new JwtSettings { RefreshTokenExpiryDays = 7, RefreshTokenExpiryDaysAbsolute = 30 }),
            Options.Create(new WebSocketSettings { Secret = "ws" }),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<RefreshTokensCommandHandler>>()
        );

        var res = await sut.Handle(new RefreshTokensCommand(null, cookie, sid, "UA", "dev"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        res.Value.RefreshToken.Should().Be("ok-after-retry");
    }

    // --- SQL-backed shims ---
    private sealed class SqlRefreshRepo : IRefreshTokenRepository
    {
        private readonly string _cs; public SqlRefreshRepo(string cs) => _cs = cs;

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
                   AND Status = 1
                   AND RevokedUtc IS NULL
                   AND ExpiresAbsoluteUtc >= @now
                   AND ExpiresRollingUtc  >= @now
                 LIMIT 1
                 FOR UPDATE;
                """, new { sid = sessionId, hash = cookieHash, now = nowUtc });
        }

        public async Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            try
            {
                return await c.ExecuteAsync("""
                    UPDATE RefreshTokens
                       SET HashedToken = @NewHash,
                           AccessTokenJti = @NewJti,
                           ExpiresRollingUtc = @NewRolling
                     WHERE TokenId = @Id
                       AND HashedToken = @OldHash
                       AND Status = 1;
                    """, new { Id = tokenId, OldHash = oldHash, NewHash = newHash, NewJti = newAccessJti, NewRolling = newRollingUtc });
            }
            catch (MySqlException ex) when (ex.Number == 1062)
            {
                throw;
            }
        }

        // Unused
        public Task<int> InsertAsync(Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity row, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize, CancellationToken ct) => 
            Task.FromResult(Enumerable.Empty<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>());
        public Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct) => Task.FromResult(false);
    }

    private sealed class SqlUserRepo : IUserRepository
    {
        private readonly string _cs; public SqlUserRepo(string cs) => _cs = cs;

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

        public Task<bool> UserExistsAsync(string email, CancellationToken ct) => Task.FromResult(false);
        public Task<bool> CreateUserAsync(Backend.Domain.Entities.User.UserModel user, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct) => Task.FromResult(true);
    }
}
