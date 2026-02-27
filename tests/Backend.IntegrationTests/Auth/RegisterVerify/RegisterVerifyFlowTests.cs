using Backend.Application.Features.Authentication.Register.Orchestrator;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using MySqlConnector;
using Xunit;
using System.Text.RegularExpressions;

using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.EmailOutbox;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Application.Orchestrators;
using Backend.Domain.Entities.User;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Repositories.Email;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Options.Verification;
using Backend.Application.Orchestrators.Email;
using Backend.Application.Features.VerifyEmail;
using Backend.IntegrationTests.Shared;
using Backend.Application.Features.Authentication.Register;
using Backend.Application.Orchestrators.Email.Generators;


namespace Backend.IntegrationTests.Auth.RegisterVerify;

[Collection("it:db")]
public sealed class RegisterVerifyFlowTests
{
    private sealed class FixedCodeGen : IVerificationCodeGenerator
    {
        public string New6Digits() => "123456";
    }
    private readonly MariaDbFixture _db;
    public RegisterVerifyFlowTests(MariaDbFixture db) => _db = db;


    private readonly Mock<ITurnstileService> _turnstile = new();
    private readonly Mock<IEmailRateLimiter> _rateLimiter = new();
    private readonly Mock<ITimeProvider> _clock = new();

    [Fact]
    public async Task Given_NewUser_When_Register_Then_CodeQueued_And_Verify_Then_EmailConfirmed_And_CodeDeleted()
    {
        await _db.ResetAsync();

        var now = new DateTime(2025, 2, 2, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var opt = new VerificationCodeOptions
        {
            TtlMinutes = 15,
            CodeHmacKeyBase64 = Convert.ToBase64String(new byte[32]
            {
                1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
                17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32
            })
        };

        // IMPORTANT: make sure seeding bypass is NOT enabled
        Environment.SetEnvironmentVariable("ALLOW_SEEDING", null);

        // SQL-backed shims / repos
        var users = new SqlUsers(_db.ConnectionString);
        var codes = new SqlEmailVerificationCodes(_db.ConnectionString);
        var outbox = new SqlEmailOutbox(_db.ConnectionString);

        _turnstile.Setup(x => x.ValidateAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(true);

        _rateLimiter.Setup(r => r.CheckAsync(It.IsAny<Guid>(), EmailKind.Verification, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new RateLimitDecision(true));

        _rateLimiter.Setup(r => r.MarkSentAsync(It.IsAny<Guid>(), EmailKind.Verification, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
                    .Returns(Task.CompletedTask);

        IVerificationCodeOrchestrator verificationOrc =
            new VerificationCodeOrchestrator(
                codes, outbox, _rateLimiter.Object, new FixedCodeGen(), _clock.Object, Options.Create(opt)
            );

        var regOrc = new RegistrationOrchestrator(
            users,
            _turnstile.Object,
            verificationOrc,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<RegistrationOrchestrator>.Instance
        );

        // act: register
        var regRes = await regOrc.RegisterAsync(
            firstName: "Test",
            lastName: "User",
            email: "user@example.com",
            password: "Secret123!",
            humanToken: "turnstile-ok",
            honeypot: "",               // empty = real user
            remoteIp: "127.0.0.1",
            trustedSeed: false,          // if your interface includes it
            ct: CancellationToken.None
        );

        regRes.IsSuccess.Should().BeTrue();
        regRes.Value!.IsHoneypot.Should().BeFalse();
        regRes.Value.User.Should().NotBeNull();

        // Assert: user exists and is NOT confirmed yet
        var created = await users.GetUserModelAsync(email: "user@example.com", ct: CancellationToken.None);
        created.Should().NotBeNull();
        created!.EmailConfirmed.Should().BeFalse();

        // Assert: code row exists
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            var codeCount = await conn.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM EmailVerificationCodes WHERE PersoId = @PersoId;",
                new { PersoId = created.PersoId });

            codeCount.Should().Be(1);
        }

        // Extract code from outbox email body (this is how we can verify, since DB stores only hash)
        string bodyHtml;
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            bodyHtml = await conn.ExecuteScalarAsync<string>(
                "SELECT BodyHtml FROM EmailOutbox WHERE ToEmail = @Email ORDER BY Id DESC LIMIT 1;",
                new { Email = created.Email });
        }

        bodyHtml.Should().NotBeNullOrWhiteSpace();

        var m = Regex.Match(bodyHtml, @"\b\d{6}\b");
        m.Success.Should().BeTrue("verification email body should contain a 6-digit code");

        var code = m.Value;

        // ACT: verify
        var verify = new VerifyEmailCodeCommandHandler(
            users,
            codes,
            _clock.Object,
            Options.Create(opt)
        );

        var verRes = await verify.Handle(new VerifyEmailCodeCommand(created.Email, code), CancellationToken.None);
        verRes.IsSuccess.Should().BeTrue();

        // Assert: confirmed
        var after = await users.GetUserModelAsync(persoid: created.PersoId, ct: CancellationToken.None);
        after!.EmailConfirmed.Should().BeTrue();

        // Assert: code deleted
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            var cnt = await conn.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM EmailVerificationCodes WHERE Persoid = @Persoid;",
                new { Persoid = created.PersoId });

            cnt.Should().Be(0);
        }
    }

    private sealed class SqlEmailVerificationCodes : IEmailVerificationCodeRepository
    {
        private readonly string _cs;
        public SqlEmailVerificationCodes(string cs) => _cs = cs;

        public async Task UpsertActiveForRegisterAsync(Guid persoid, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct)
        {
            const string sql = @"
INSERT INTO EmailVerificationCodes
  (PersoId, CodeHash, ExpiresAtUtc, AttemptCount, LockedUntilUtc, SentCount, LastSentAtUtc, CreatedAtUtc)
VALUES
  (@PersoId, @CodeHash, @ExpiresAtUtc, 0, NULL, 0, NULL, @NowUtc)
ON DUPLICATE KEY UPDATE
  CodeHash = VALUES(CodeHash),
  ExpiresAtUtc = VALUES(ExpiresAtUtc),
  AttemptCount = 0,
  LockedUntilUtc = NULL;";

            await using var conn = new MySqlConnection(_cs);
            await conn.ExecuteAsync(new CommandDefinition(sql, new
            {
                PersoId = persoid,
                CodeHash = codeHash,
                ExpiresAtUtc = expiresAtUtc,
                NowUtc = nowUtc
            }, cancellationToken: ct));
        }

        public async Task UpsertActiveForResendAsync(Guid persoid, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct)
        {
            const string sql = @"
INSERT INTO EmailVerificationCodes
  (PersoId, CodeHash, ExpiresAtUtc, AttemptCount, LockedUntilUtc, SentCount, LastSentAtUtc, CreatedAtUtc)
VALUES
  (@PersoId, @CodeHash, @ExpiresAtUtc, 0, NULL, 0, NULL, @NowUtc)
ON DUPLICATE KEY UPDATE
  CodeHash = VALUES(CodeHash),
  ExpiresAtUtc = VALUES(ExpiresAtUtc);";

            await using var conn = new MySqlConnection(_cs);
            await conn.ExecuteAsync(new CommandDefinition(sql, new
            {
                PersoId = persoid,
                CodeHash = codeHash,
                ExpiresAtUtc = expiresAtUtc,
                NowUtc = nowUtc
            }, cancellationToken: ct));
        }

        public async Task<EmailVerificationCodeState?> GetByUserAsync(Guid persoid, CancellationToken ct)
        {
            const string sql = @"
SELECT CodeHash, ExpiresAtUtc, AttemptCount, LockedUntilUtc, SentCount, LastSentAtUtc
FROM EmailVerificationCodes
WHERE PersoId = @PersoId
LIMIT 1;";

            await using var conn = new MySqlConnection(_cs);
            return await conn.QueryFirstOrDefaultAsync<EmailVerificationCodeState>(
                new CommandDefinition(sql, new { PersoId = persoid }, cancellationToken: ct));
        }

        public async Task IncrementFailureAsync(Guid persoid, int newAttemptCount, DateTime? lockedUntilUtc, CancellationToken ct)
        {
            const string sql = @"
UPDATE EmailVerificationCodes
SET AttemptCount = @AttemptCount,
    LockedUntilUtc = @LockedUntilUtc
WHERE PersoId = @PersoId;";

            await using var conn = new MySqlConnection(_cs);
            await conn.ExecuteAsync(new CommandDefinition(sql, new
            {
                PersoId = persoid,
                AttemptCount = newAttemptCount,
                LockedUntilUtc = lockedUntilUtc
            }, cancellationToken: ct));
        }

        public async Task MarkSentAsync(Guid persoid, DateTime nowUtc, CancellationToken ct)
        {
            const string sql = @"
UPDATE EmailVerificationCodes
SET SentCount = SentCount + 1,
    LastSentAtUtc = @NowUtc
WHERE PersoId = @PersoId;";

            await using var conn = new MySqlConnection(_cs);
            await conn.ExecuteAsync(new CommandDefinition(sql, new { PersoId = persoid, NowUtc = nowUtc }, cancellationToken: ct));
        }

        public async Task DeleteAsync(Guid persoid, CancellationToken ct)
        {
            const string sql = "DELETE FROM EmailVerificationCodes WHERE PersoId = @PersoId;";
            await using var conn = new MySqlConnection(_cs);
            await conn.ExecuteAsync(new CommandDefinition(sql, new { PersoId = persoid }, cancellationToken: ct));
        }
        public Task UpsertActiveAsync(Guid persoid, byte[] codeHash, DateTime expiresAtUtc, DateTime nowUtc, CancellationToken ct)
    // “legacy” = same semantics as register (reset attempts/unlock)
    => UpsertActiveForRegisterAsync(persoid, codeHash, expiresAtUtc, nowUtc, ct);

    }

    // -------- SQL-backed test repos --------

    private sealed class SqlUsers : IUserRepository
    {
        private readonly string _cs;
        public SqlUsers(string cs) => _cs = cs;

        public async Task<bool> UserExistsAsync(string email, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            var cnt = await c.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM Users WHERE Email = @eml;", new { eml = email });
            return cnt > 0;
        }

        public async Task<bool> CreateUserAsync(UserModel user, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            var rows = await c.ExecuteAsync("""
                INSERT INTO Users
                  (PersoId, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
                VALUES
                  (@pid, @fn, @ln, @eml, 0, @pwd, @roles, 0, 1, 'it');
                """, new
            {
                pid = user.PersoId,
                fn = user.FirstName ?? "N/A",
                ln = user.LastName ?? "N/A",
                eml = user.Email,
                pwd = user.Password,
                roles = user.Roles ?? "User"
            });
            return rows == 1;
        }

        public async Task<UserModel?> GetUserModelAsync(Guid? persoid = null, string? email = null, CancellationToken ct = default)
        {
            await using var c = new MySqlConnection(_cs);
            if (persoid is not null)
                return await c.QuerySingleOrDefaultAsync<UserModel>(
                    "SELECT Id, PersoId, Email, Password, EmailConfirmed FROM Users WHERE PersoId = @id LIMIT 1;",
                    new { id = persoid });
            if (email is not null)
                return await c.QuerySingleOrDefaultAsync<UserModel>(
                    "SELECT Id, PersoId, Email, Password, EmailConfirmed FROM Users WHERE Email = @eml LIMIT 1;",
                    new { eml = email });
            return null;
        }

        public async Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            var rows = await c.ExecuteAsync(
                "UPDATE Users SET EmailConfirmed = 1 WHERE PersoId = @id;", new { id = persoid });
            return rows == 1;
        }
        public async Task<bool> SetFirstTimeLoginAsync(Guid persoid, CancellationToken ct = default)
        {
            await using var c = new MySqlConnection(_cs);
            var rows = await c.ExecuteAsync(
                "UPDATE Users SET FirstLogin = 0 WHERE PersoId = @id;", new { id = persoid });
            return rows == 1;
        }
    }

    private sealed class SqlVerificationTokens : IVerificationTokenRepository
    {
        private readonly string _cs;
        public SqlVerificationTokens(string cs) => _cs = cs;

        public async Task<int> UpsertSingleActiveAsync(Guid persoid, Guid token, DateTime expiryUtc, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            var rows = await c.ExecuteAsync("""
                INSERT INTO VerificationToken (PersoId, Token, TokenExpiryDate)
                VALUES (@pid, @tok, @exp)
                ON DUPLICATE KEY UPDATE
                    Token           = VALUES(Token),
                    TokenExpiryDate = VALUES(TokenExpiryDate);
                """, new { pid = persoid, tok = token, exp = expiryUtc });
            // MySQL returns 1 for INSERT, 2 for UPDATE in some cases; we just normalize to 1/0
            return rows > 0 ? 1 : 0;
        }

        public async Task<UserTokenModel?> GetByTokenAsync(Guid token, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.QuerySingleOrDefaultAsync<UserTokenModel>(
                "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE Token = @t LIMIT 1;",
                new { t = token });
        }

        public async Task<UserTokenModel?> GetByUserAsync(Guid persoid, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.QuerySingleOrDefaultAsync<UserTokenModel>(
                "SELECT PersoId, Token, TokenExpiryDate FROM VerificationToken WHERE PersoId = @id LIMIT 1;",
                new { id = persoid });
        }

        public async Task<int> DeleteByTokenAsync(Guid token, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.ExecuteAsync("DELETE FROM VerificationToken WHERE Token = @t;", new { t = token });
        }

        public async Task<int> DeleteAllForUserAsync(Guid persoid, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            return await c.ExecuteAsync("DELETE FROM VerificationToken WHERE PersoId = @id;", new { id = persoid });
        }
    }
    private sealed class SqlEmailOutbox : IEmailOutboxRepository
    {
        private readonly string _cs;
        public SqlEmailOutbox(string cs) => _cs = cs;

        public async Task EnqueueAsync(string kind, string toEmail, string subject, string bodyHtml, DateTime nowUtc, CancellationToken ct)
        {
            const string sql = @"
INSERT INTO EmailOutbox
  (Kind, ToEmail, Subject, BodyHtml, Attempts, NextAttemptAtUtc, CreatedAtUtc)
VALUES
  (@Kind, @ToEmail, @Subject, @BodyHtml, 0, @NowUtc, @NowUtc);";

            await using var conn = new MySqlConnection(_cs);
            await conn.ExecuteAsync(new CommandDefinition(sql, new
            {
                Kind = kind,
                ToEmail = toEmail,
                Subject = subject,
                BodyHtml = bodyHtml,
                NowUtc = nowUtc
            }, cancellationToken: ct));
        }

        public Task<IReadOnlyList<EmailOutboxItem>> ClaimDueAsync(Guid workerId, int take, DateTime nowUtc, TimeSpan lockFor, CancellationToken ct)
            => Task.FromResult<IReadOnlyList<EmailOutboxItem>>(Array.Empty<EmailOutboxItem>());

        public Task MarkSentAsync(long id, string? providerId, DateTime nowUtc, CancellationToken ct) => Task.CompletedTask;
        public Task MarkFailedAsync(long id, int attempts, DateTime nextAttemptAtUtc, string error, DateTime nowUtc, CancellationToken ct) => Task.CompletedTask;
    }

}

