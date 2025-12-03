using System;
using System.Security.Cryptography;
using System.Text;
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
using Backend.Application.Features.Authentication.Login;
using Backend.Application.Features.Authentication;
using Backend.Application.DTO.Auth;
using Backend.Domain.Shared;
using Backend.Domain.Users;
using Backend.Settings;
using Backend.IntegrationTests.Shared;
using Backend.Domain.Entities.User;
using Microsoft.Extensions.Configuration;
namespace Backend.IntegrationTests.Auth.Login;

[Collection("it:db")]
public sealed class LoginInsertCollisionTests
{
    private readonly MariaDbFixture _db;
    public LoginInsertCollisionTests(MariaDbFixture db) => _db = db;

    private static string Sha256Hex(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }

    [Fact]
    public async Task Given_CollisionOnHashedToken_When_Login_Then_RetryAndSucceed()
    {
        await _db.ResetAsync();
        var now = new DateTime(2025, 2, 2, 11, 0, 0, DateTimeKind.Utc);

        // Fixed clock
        var clock = new Mock<ITimeProvider>();
        clock.SetupGet(x => x.UtcNow).Returns(now);

        // Seed confirmed user with bcrypt for "dummy"
        var hashed = BCrypt.Net.BCrypt.HashPassword("dummy"); // work factor/defaults fine
        var userId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
        INSERT INTO Users
        (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES (@pid, 'Test', 'User', 'user@example.com', 1, @pwd, 'User', 0, 0, 'it');
        """, new { pid = userId, pwd = hashed });

        // SQL-backed repos
        var users = new SqlUsers(_db.ConnectionString);

        var realRefresh = new SqlRefreshRepo(_db.ConnectionString);
        var refresh = new CollisionOnceRefreshRepo(realRefresh, _db.ConnectionString);

        // Mocks for non-DB dependencies
        var jwt = new Mock<IJwtService>();
        var sessionId = Guid.NewGuid();
        var tokenJti = Guid.NewGuid().ToString();

        jwt.Setup(j => j.CreateAccessToken(
                    userId,
                    "user@example.com",
                    It.IsAny<IReadOnlyList<string>>(),
                    "dev",
                    "UA",
                    It.IsAny<Guid?>())) // <- explicitly match the optional parameter
        .Returns(new Backend.Application.Common.Security.AccessTokenResult(
                "at.jwt", tokenJti, sessionId, userId, now.AddMinutes(15)));

        jwt.SetupSequence(j => j.CreateRefreshToken()).Returns("rt1").Returns("rt2"); // first collides, second succeeds
        jwt.Setup(j => j.BlacklistJwtTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var recaptcha = new Mock<IRecaptchaService>();
        recaptcha.Setup(x => x.ValidateTokenAsync(It.IsAny<string>())).ReturnsAsync(true);

        var authz = new Mock<IUserAuthenticationRepository>();
        authz.Setup(a => a.InsertLoginAttemptAsync(It.IsAny<Backend.Domain.Entities.User.UserModel>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        authz.Setup(a => a.CountFailedAttemptsSinceAsync(It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);
        authz.Setup(a => a.DeleteAttemptsByEmailAsync("user@example.com", It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var lockout = Options.Create(new AuthLockoutOptions { WindowMinutes = 15, MaxAttempts = 5, LockoutMinutes = 15 });
        var jwtOpts = Options.Create(new JwtSettings { RefreshTokenExpiryDays = 7, RefreshTokenExpiryDaysAbsolute = 30 });
        var wsOpts = Options.Create(new Backend.Settings.WebSocketSettings { Secret = "ws" });
        var configuration = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WebSocket:Secret"] = "ws",
                ["Jwt:RefreshTokenExpiryDays"] = "7",
                ["Jwt:RefreshTokenExpiryDaysAbsolute"] = "30"
            })
            .Build();

        var sut = new LoginCommandHandler(
            uow: Mock.Of<IUnitOfWork>(),
            recaptcha: recaptcha.Object,
            authz: authz.Object,
            lockoutOpts: lockout,
            users: users,
            refreshRepo: refresh,
            jwt: jwt.Object,
            clock: clock.Object,
            jwtSettings: jwtOpts,
            configuration: configuration,
            log: Mock.Of<Microsoft.Extensions.Logging.ILogger<LoginCommandHandler>>(),
            wsOpts: wsOpts
        );

        var cmd = new LoginCommand(
            Email: "user@example.com",
            Password: "dummy", // matches bcrypt above
            CaptchaToken: "ok",
            RememberMe: false,
            Ip: "127.0.0.1",
            DeviceId: "dev",
            UserAgent: "UA"
        );

        var result = await sut.Handle(cmd, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.RefreshToken.Should().Be("rt2"); // retry token returned

        var rows = await conn.QuerySingleAsync<long>(
            "SELECT COUNT(*) FROM RefreshTokens WHERE Persoid=@pid;", new { pid = userId });
        rows.Should().BeGreaterOrEqualTo(2);
    }

    // ---------- SQL repos ----------

    private sealed class SqlUsers : IUserRepository
    {
        private readonly string _cs;
        public SqlUsers(string cs) => _cs = cs;

        public async Task<Backend.Domain.Entities.User.UserModel?> GetUserModelAsync(Guid? persoid = null, string? email = null, CancellationToken ct = default)
        {
            await using var c = new MySqlConnection(_cs);
            if (email is not null)
                return await c.QuerySingleOrDefaultAsync<Backend.Domain.Entities.User.UserModel>(
                    "SELECT Id, Persoid AS PersoId, Email, Password, EmailConfirmed FROM Users WHERE Email=@eml LIMIT 1;", new { eml = email });
            if (persoid is not null)
                return await c.QuerySingleOrDefaultAsync<Backend.Domain.Entities.User.UserModel>(
                    "SELECT Id, Persoid AS PersoId, Email, Password, EmailConfirmed FROM Users WHERE Persoid=@id LIMIT 1;", new { id = persoid });
            return null;
        }

        public Task<bool> UserExistsAsync(string email, CancellationToken ct) => Task.FromResult(false);
        public Task<bool> CreateUserAsync(UserModel user, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> SetFirstTimeLoginAsync(Guid persoid, CancellationToken ct = default) => Task.FromResult(true);
    }

    private sealed class SqlRefreshRepo : IRefreshTokenRepository
    {
        private readonly string _cs;
        public SqlRefreshRepo(string cs) => _cs = cs;

        public async Task<int> InsertAsync(Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity row, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            try
            {
                return await c.ExecuteAsync("""
                INSERT INTO RefreshTokens
                (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, DeviceId, UserAgent, CreatedUtc)
                VALUES
                (@Id, @Pid, @Sid, @Hash, @Jti, @Roll, @Abs, @Status, @Persist, @Dev, @UA, @Now);
                """, new
                {
                    Id = row.TokenId,
                    Pid = row.Persoid,
                    Sid = row.SessionId,
                    Hash = row.HashedToken,
                    Jti = row.AccessTokenJti,
                    Roll = row.ExpiresRollingUtc,
                    Abs = row.ExpiresAbsoluteUtc,
                    Status = (int)row.Status,
                    Persist = row.IsPersistent,
                    Dev = row.DeviceId,
                    UA = row.UserAgent,
                    Now = row.CreatedUtc
                });
            }
            catch (MySqlException ex) when (ex.Number == 1062) // ER_DUP_ENTRY
            {
                throw new DuplicateKeyException("Duplicate entry for refresh token hash.", ex);
            }
        }

        public async Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.ExecuteAsync("""
            UPDATE RefreshTokens
            SET RevokedUtc = @now, Status = 2
            WHERE Persoid = @pid AND SessionId = @sid AND RevokedUtc IS NULL;
            """, new { pid = persoId, sid = sessionId, now = nowUtc });
        }

        // Unused in this test
        public Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct) => Task.FromResult<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?>(null);
        public Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize = 1000, CancellationToken ct = default) => Task.FromResult<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>>(Array.Empty<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>());
        public Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct) => Task.FromResult(false);
    }
    private sealed class CollisionOnceRefreshRepo : IRefreshTokenRepository
    {
        private readonly IRefreshTokenRepository _inner;
        private readonly string _cs;
        private bool _armed = true;

        public CollisionOnceRefreshRepo(IRefreshTokenRepository inner, string connectionString)
        {
            _inner = inner;
            _cs = connectionString;
        }

        public async Task<int> InsertAsync(Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity row, CancellationToken ct)
        {
            if (_armed)
            {
                _armed = false;

                await using var c = new MySqlConnection(_cs);
                await c.OpenAsync(ct);

                // Ensure UNIQUE index on HashedToken exists (ignore "duplicate key name" error 1061)
                try
                {
                    await c.ExecuteAsync(@"CREATE UNIQUE INDEX UX_RefreshTokens_HashedToken ON RefreshTokens(HashedToken);");
                }
                catch (MySqlException ex) when (ex.Number == 1061)
                {
                    // index already exists -> ignore
                }

                // Pre-insert a row with the SAME HashedToken as the one the SUT will try to insert,
                // guaranteeing a 1062 on the upcoming inner.InsertAsync call.
                await c.ExecuteAsync("""
                    INSERT INTO RefreshTokens
                    (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, DeviceId, UserAgent, CreatedUtc)
                    VALUES
                    (@tid, @pid, @sid, @hash, @jti, @roll, @abs, 1, 0, 'decorator', 'decorator', @now);
                    """,
                    new
                    {
                        tid = Guid.NewGuid(),
                        pid = row.Persoid,
                        sid = Guid.NewGuid(),
                        hash = row.HashedToken,              // << exact same hash as SUT
                        jti = Guid.NewGuid().ToString(),
                        roll = DateTime.UtcNow.AddDays(7),
                        abs = DateTime.UtcNow.AddDays(30),
                        now = DateTime.UtcNow
                    });
                // do NOT catch here; we want inner.InsertAsync to throw 1062 so the handler retries
            }

            return await _inner.InsertAsync(row, ct);
        }

        // passthroughs
        public Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct)
            => _inner.RevokeSessionAsync(persoId, sessionId, nowUtc, ct);
        public Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct)
            => _inner.RevokeAllForUserAsync(persoid, nowUtc, ct);
        public Task<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct)
            => _inner.GetActiveByCookieForUpdateAsync(sessionId, cookieHash, nowUtc, ct);
        public Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct)
            => _inner.RotateInPlaceAsync(tokenId, oldHash, newHash, newAccessJti, newRollingUtc, ct);
        public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct)
            => _inner.RevokeByIdAsync(tokenId, nowUtc, ct);
        public Task<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize = 1000, CancellationToken ct = default)
            => _inner.GetExpiredTokensAsync(batchSize, ct);
        public Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct)
            => _inner.DeleteTokenAsync(refreshToken, ct);
        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct)
            => _inner.DoesAccessTokenJtiExistAsync(accessTokenJti, ct);
    }
}
