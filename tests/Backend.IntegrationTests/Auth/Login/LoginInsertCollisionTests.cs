using Backend.Application.Common.Security;
using Backend.Application.Features.Shared.Issuers.Auth;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Infrastructure.Entities.Tokens;
using Backend.Domain.Shared;
using Backend.Settings;
using Backend.IntegrationTests.Shared;
using Backend.Domain.Entities.User;
using Backend.Domain.Entities.Email;



namespace Backend.IntegrationTests.Auth.Login;


[Collection("it:db")]
public sealed class LoginInsertCollisionTests
{
    private readonly MariaDbFixture _db;
    public LoginInsertCollisionTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task Given_CollisionOnHashedToken_When_IssueAsync_Then_RetryAndSucceed()
    {
        await _db.ResetAsync();
        var now = new DateTime(2025, 2, 2, 11, 0, 0, DateTimeKind.Utc);

        var clock = new Mock<ITimeProvider>();
        clock.SetupGet(x => x.UtcNow).Returns(now);

        // User model for issuer (no DB needed)
        var userId = Guid.NewGuid();
        var user = new UserModel
        {
            PersoId = userId,
            Email = "user@example.com",
            Password = "dummy-hash",
            FirstName = "Test",
            LastName = "User",
            Roles = "1",
            EmailConfirmed = true
        };
        await using (var conn1 = new MySqlConnection(_db.ConnectionString))
        {
            await conn1.OpenAsync();

            // Insert minimal user row to satisfy FK RefreshTokens(Persoid) -> Users(Persoid)
            await conn1.ExecuteAsync("""
        INSERT INTO Users
          (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
        VALUES
          (@pid, @fn, @ln, @eml, 1, @pwd, @roles, 0, 0, 'it');
        """, new
            {
                pid = userId,
                fn = user.FirstName,
                ln = user.LastName,
                eml = user.Email,
                pwd = user.Password,
                roles = user.Roles
            });
        }

        // JWT mock: access token + refresh tokens
        var jwt = new Mock<IJwtService>();
        var sessionId = Guid.NewGuid();
        var tokenJti = Guid.NewGuid().ToString();

        // IMPORTANT: no named args in Moq Setup
        jwt.Setup(j => j.CreateAccessToken(
                userId,
                "user@example.com",
                It.IsAny<IReadOnlyList<string>>(),
                "dev",
                "UA",
                true,
                (Guid?)null
            ))
            .Returns(new Backend.Application.Common.Security.AccessTokenResult(
                "at.jwt", tokenJti, sessionId, userId, now.AddMinutes(15)));

        jwt.SetupSequence(j => j.CreateRefreshToken())
           .Returns("rt1")
           .Returns("rt2");

        // Real refresh repo + DB collision decorator
        var realRefresh = new SqlRefreshRepo(_db.ConnectionString);
        var refresh = new CollisionOnceRefreshRepo(realRefresh, _db.ConnectionString);

        // Settings
        var jwtOpts = Options.Create(new JwtSettings
        {
            RefreshTokenExpiryDays = 7,
            RefreshTokenExpiryDaysAbsolute = 30
        });

        var wsCfg = Options.Create(new WebSocketSettings { Secret = "ws" });

        // Issuer under test (use your real class + correct ctor signature)
        var issuer = new AuthSessionIssuer(
            refreshRepo: refresh,
            jwt: jwt.Object,
            clock: clock.Object,
            jwtSettings: jwtOpts,
            wsOpts: wsCfg
        );

        // ACT
        var issued = await issuer.IssueAsync(
            user,
            rememberMe: false,
            deviceId: "dev",
            userAgent: "UA",
            ct: CancellationToken.None);

        // ASSERT: second refresh token used after collision
        issued.RefreshToken.Should().Be("rt2");
        issued.Result.AccessToken.Should().Be("at.jwt");
        issued.Result.PersoId.Should().Be(userId);
        issued.Result.SessionId.Should().Be(sessionId);

        // DB assert: at least 1 row for this user exists
        await using var conn = new MySqlConnection(_db.ConnectionString);
        var rows = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM RefreshTokens WHERE Persoid=@pid;",
            new { pid = userId });

        rows.Should().BeGreaterOrEqualTo(1);
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
        public Task<bool> UpsertUserPreferencesAsync(Guid persoId, string locale, string currency, CancellationToken ct = default) => Task.FromResult(true);
        public Task<UserPreferencesReadModel?> GetUserPreferencesAsync(Guid persoid, CancellationToken ct = default) => Task.FromResult<UserPreferencesReadModel?>(null);
        public Task<bool> UpdatePasswordAsync(Guid persoId, string passwordHash, CancellationToken ct) => Task.FromResult(true);
        public Task<EmailRegistrationState> GetEmailRegistrationStateAsync(string email, CancellationToken ct = default) => Task.FromResult<EmailRegistrationState>(null);
        public Task<bool> UpdateUserProfileAsync(Guid persoId, string firstName, string lastName, CancellationToken ct = default) => Task.FromResult(true);
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
        public Task<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(string cookieHash, DateTime nowUtc, CancellationToken ct) => Task.FromResult<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?>(null);
        public Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize = 1000, CancellationToken ct = default) => Task.FromResult<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>>(Array.Empty<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>());
        public Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct) => Task.FromResult(false);
        public Task<int> RevokeBySessionIdAsync(Guid sessionId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeByRefreshTokenAsync(string refreshTokenRaw, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
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

        public async Task<int> InsertAsync(RefreshJwtTokenEntity row, CancellationToken ct)
        {
            if (_armed)
            {
                _armed = false;

                await using var c = new MySqlConnection(_cs);
                await c.OpenAsync(ct);

                // Pre-insert a row with the SAME HashedToken as the row about to be inserted.
                // This guarantees MySQL 1062 on the upcoming inner.InsertAsync.
                await c.ExecuteAsync("""
                INSERT INTO RefreshTokens
                (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc,
                 Status, IsPersistent, DeviceId, UserAgent, CreatedUtc)
                VALUES
                (@tid, @pid, @sid, @hash, @jti, @roll, @abs, 1, 0, 'decorator', 'decorator', @now);
                """,
                    new
                    {
                        tid = Guid.NewGuid(),
                        pid = row.Persoid,
                        sid = Guid.NewGuid(),
                        hash = row.HashedToken,
                        jti = Guid.NewGuid().ToString(),
                        roll = DateTime.UtcNow.AddDays(7),
                        abs = DateTime.UtcNow.AddDays(30),
                        now = DateTime.UtcNow
                    });
            }

            return await _inner.InsertAsync(row, ct);
        }

        // passthroughs (only those required by interface)
        public Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct)
            => _inner.RevokeSessionAsync(persoId, sessionId, nowUtc, ct);

        public Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct)
            => _inner.RevokeAllForUserAsync(persoid, nowUtc, ct);

        public Task<RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(string cookieHash, DateTime nowUtc, CancellationToken ct)
            => _inner.GetActiveByCookieForUpdateAsync(cookieHash, nowUtc, ct);

        public Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct)
            => _inner.RotateInPlaceAsync(tokenId, oldHash, newHash, newAccessJti, newRollingUtc, ct);

        public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct)
            => _inner.RevokeByIdAsync(tokenId, nowUtc, ct);

        public Task<IEnumerable<RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize = 1000, CancellationToken ct = default)
            => _inner.GetExpiredTokensAsync(batchSize, ct);

        public Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct)
            => _inner.DeleteTokenAsync(refreshToken, ct);

        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct)
            => _inner.DoesAccessTokenJtiExistAsync(accessTokenJti, ct);
        public Task<int> RevokeBySessionIdAsync(Guid sessionId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
        public Task<int> RevokeByRefreshTokenAsync(string refreshTokenRaw, DateTime nowUtc, CancellationToken ct) => Task.FromResult(0);
    }
}
