using System;
using System.Linq;
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
using MediatR;
using Microsoft.Extensions.DependencyInjection;

using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Commands.Auth.RefreshToken;
using Backend.Infrastructure.Repositories.Auth.RefreshTokens;
using Backend.Infrastructure.Repositories.User;
using Backend.Application.Common.Security;
using Backend.IntegrationTests.Shared;
using Backend.Settings;
using Backend.Domain.Users;
using Backend.Infrastructure.Security;

namespace Backend.IntegrationTests.Auth.Refresh;
// test collection
[Collection("it:db")]
public sealed class RefreshConcurrencyTests
{
    private readonly MariaDbFixture _db;
    public RefreshConcurrencyTests(MariaDbFixture db) => _db = db;

    private static string Sha256Hex(string s)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(s));
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }

    [Fact]
    public async Task Given_TwoSimultaneousRefreshes_When_Rotate_Then_ExactlyOneWins()
    {
        await _db.ResetAsync();

        // Common fixtures
        var now = new DateTime(2025, 2, 1, 12, 0, 0, DateTimeKind.Utc);
        var clock = new Mock<ITimeProvider>(); clock.SetupGet(x => x.UtcNow).Returns(now);

        var sessionId = Guid.NewGuid();
        var persoid   = Guid.NewGuid();
        const string email = "user@example.com";
        const string ua = "UA";
        const string dev = "dev";

        var cookie = "cookie-1";
        var cookieHash = TokenGenerator.HashToken(cookie); // ✅ SAME AS PROD

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        // Seed
        await conn.ExecuteAsync("""
            INSERT INTO Users
            (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES (@pid, 'Test', 'User', @eml, 1, 'hash', 'User', 0, 0, 'it');
        """, new { pid = persoid, eml = email });

        await conn.ExecuteAsync("""
            INSERT INTO RefreshTokens
            (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti, ExpiresRollingUtc, ExpiresAbsoluteUtc, Status, IsPersistent, DeviceId, UserAgent, CreatedUtc)
            VALUES (@tid, @pid, @sid, @hash, @jti, @roll, @abs, 1, 1, @dev, @ua, @now);
        """, new {
            tid = Guid.NewGuid(), pid = persoid, sid = sessionId,
            hash = cookieHash, jti = Guid.NewGuid().ToString(),
            roll = now.AddDays(7), abs = now.AddDays(30),
            dev, ua, now
        });

        // Mocks & settings
        var jwt = new Mock<IJwtService>();
        jwt.Setup(j => j.CreateAccessToken(persoid, email, It.IsAny<IReadOnlyList<string>>(), dev, ua, sessionId))
        .Returns(new AccessTokenResult("new.at", Guid.NewGuid().ToString(), sessionId, persoid, now.AddMinutes(15)));
        jwt.SetupSequence(j => j.CreateRefreshToken()).Returns("rt1").Returns("rt2");

        var jwtSettings = new JwtSettings { RefreshTokenExpiryDays = 7, RefreshTokenExpiryDaysAbsolute = 30 };
        var wsSettings  = new WebSocketSettings { Secret = "ws" };

        // ---- Build DI so MediatR pipeline runs (IMPORTANT) ----
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IOptions<DatabaseSettings>>(Options.Create(new DatabaseSettings { ConnectionString = _db.ConnectionString }));

        // UoW is Scoped so each scope gets its own conn/tx
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Repos use SqlBase -> UoW connection/tx
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IUserRepository, UserRepository>(); // your existing impl

        // Handler deps
        services.AddScoped<ITimeProvider>(_ => clock.Object);
        services.AddScoped<IJwtService>(_ => jwt.Object);
        services.AddSingleton<IOptions<JwtSettings>>(Options.Create(jwtSettings));
        services.AddSingleton<IOptions<WebSocketSettings>>(Options.Create(wsSettings));

        // MediatR + UoW pipeline
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssemblyContaining<RefreshTokensCommandHandler>();
            cfg.AddOpenBehavior(typeof(UnitOfWorkPipelineBehavior<,>));
        });

        await using var provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });



        // Two independent request scopes (each with its own UoW/connection/tx)
        await using var scope1 = provider.CreateAsyncScope();
        await using var scope2 = provider.CreateAsyncScope();

        var mediator1 = scope1.ServiceProvider.GetRequiredService<IMediator>();
        var mediator2 = scope2.ServiceProvider.GetRequiredService<IMediator>();
     
        var cmd = new RefreshTokensCommand(null, cookie, sessionId, "UA", "dev");

        var t1 = mediator1.Send(cmd, CancellationToken.None);
        var t2 = mediator2.Send(cmd, CancellationToken.None);

        var results = await Task.WhenAll(t1, t2);

        results.Count(r => r.IsSuccess).Should().Be(1);
        results.Count(r => !r.IsSuccess && r.Error == UserErrors.InvalidRefreshToken).Should().Be(1);
    }


    // --- SQL repo shims implementing only the methods used by handler ---

    private sealed class SqlRefreshRepo : IRefreshTokenRepository
    {
        private readonly string _cs; public SqlRefreshRepo(string cs) => _cs = cs;

        public async Task<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(
            Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.QuerySingleOrDefaultAsync<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>(
                """
                SELECT TokenId,
                    Persoid,
                    SessionId,
                    HashedToken, AccessTokenJti, DeviceId, UserAgent,
                    ExpiresRollingUtc, ExpiresAbsoluteUtc,
                    Status, IsPersistent, CreatedUtc, RevokedUtc
                FROM RefreshTokens
                WHERE SessionId = UUID_TO_BIN(@sid)
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
            return await c.ExecuteAsync(
                """
                UPDATE RefreshTokens
                SET HashedToken       = @NewHash,
                    AccessTokenJti    = @NewJti,
                    ExpiresRollingUtc = @NewRolling
                WHERE TokenId     = UUID_TO_BIN(@Id)
                AND HashedToken = @OldHash
                AND Status      = @Active;
                """,
                new { Id = tokenId, OldHash = oldHash, NewHash = newHash, NewJti = newAccessJti, NewRolling = newRollingUtc, Active = 1 });
        }

        // unused members for this test
        public Task<int> InsertAsync(Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity row, CancellationToken ct) => Task.FromResult(1);
        public Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(1);
        public Task<int> RevokeAllForUserAsync(Guid persoId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(1);
        public Task<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct, object? _ = null) => GetActiveByCookieForUpdateAsync(sessionId, cookieHash, nowUtc, ct);
        public Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct) => Task.FromResult(1);
        public Task<IEnumerable<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize = 1000, CancellationToken ct = default) => Task.FromResult(Enumerable.Empty<Backend.Infrastructure.Entities.Tokens.RefreshJwtTokenEntity>());
        public Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct) => Task.FromResult(false);
    }

    private sealed class SqlUserRepo : Backend.Application.Abstractions.Infrastructure.Data.IUserRepository
    {
        private readonly string _cs; public SqlUserRepo(string cs) => _cs = cs;

        public async Task<Backend.Domain.Entities.User.UserModel?> GetUserModelAsync(Guid? persoid = null, string? email = null, CancellationToken ct = default)
        {
            await using var c = new MySqlConnection(_cs);
            if (persoid is not null)
                return await c.QuerySingleOrDefaultAsync<Backend.Domain.Entities.User.UserModel>("SELECT Id, Persoid, Email, Password, EmailConfirmed FROM Users WHERE Persoid = @id LIMIT 1;", new { id = persoid });
            if (email is not null)
                return await c.QuerySingleOrDefaultAsync<Backend.Domain.Entities.User.UserModel>("SELECT Id, Persoid, Email, Password, EmailConfirmed FROM Users WHERE Email = @eml LIMIT 1;", new { eml = email });
            return null;
        }

        // unused
        public Task<bool> UserExistsAsync(string email, CancellationToken ct) => Task.FromResult(false);
        public Task<bool> CreateUserAsync(Backend.Domain.Entities.User.UserModel user, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct) => Task.FromResult(true);
    }
}
