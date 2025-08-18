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
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Features.Commands.Auth.Register;
using Backend.Application.Features.Commands.Auth.VerifyEmail;
using Backend.Application.Features.Events.Register;
using Backend.Application.Options.Auth;
using Backend.Application.Options.URL;
using Backend.Domain.Entities.User;
using Backend.Domain.Entities.Auth;
using Backend.Domain.Shared;
using Backend.Settings.Email;
using Backend.IntegrationTests.Shared;
using Backend.Application.Features.Register;

namespace Backend.IntegrationTests.Auth.RegisterVerify;

[Collection("it:db")]
public sealed class RegisterVerifyFlowTests
{
    private readonly MariaDbFixture _db;
    public RegisterVerifyFlowTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task Given_NewUser_When_Register_And_Event_And_Verify_Then_EmailConfirmed_And_TokensDeleted()
    {
        await _db.ResetAsync();
        var now = new DateTime(2025, 2, 2, 10, 0, 0, DateTimeKind.Utc);

        var clock = new Mock<ITimeProvider>();
        clock.SetupGet(x => x.UtcNow).Returns(now);

        // SQL-backed shims
        var users = new SqlUsers(_db.ConnectionString);
        var tokens = new SqlVerificationTokens(_db.ConnectionString);

        // Bypass captcha for l@l.se using env flag
        Environment.SetEnvironmentVariable("ALLOW_TEST_EMAILS", "true");
        try
        {
            var recaptcha = new Mock<IRecaptchaService>();
            recaptcha.Setup(x => x.ValidateTokenAsync(It.IsAny<string>()))
                     .ReturnsAsync(false); // should be bypassed by env

            var mediator = new Mock<MediatR.IMediator>();

            var register = new RegisterUserCommandHandler(users, mediator.Object, recaptcha.Object);
            var cmd = new RegisterUserCommand(
                FirstName: "Test", LastName: "User",
                Email: "l@l.se", Password: "Secret123!",
                CaptchaToken: "ignored", Honeypot: null);

            var regRes = await register.Handle(cmd, CancellationToken.None);
            regRes.IsSuccess.Should().BeTrue();

            // Event handler: creates verification token + sends email
            var rl = new Mock<IEmailRateLimiter>();
            rl.Setup(r => r.CheckAsync(It.IsAny<Guid>(), EmailKind.Verification, It.IsAny<CancellationToken>()))
              .ReturnsAsync(new RateLimitDecision(true));
            rl.Setup(r => r.MarkSentAsync(It.IsAny<Guid>(), EmailKind.Verification, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);

            var email = new Mock<IEmailService>();
            email.Setup(e => e.SendEmailAsync(It.IsAny<IEmailComposer>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new EmailSendResult(true, null, null));

            var tokOpts = Options.Create(new VerificationTokenOptions { TtlHours = 24 });
            var urls = Options.Create(new AppUrls { VerifyUrl = "https://app.ebudget.se/verify" });
            var smtp = Options.Create(new SmtpSettings { FromAddress = "noreply@ebudget.se", FromName = "eBudget" });

            var created = await users.GetUserModelAsync(email: "l@l.se", ct: CancellationToken.None);
            created.Should().NotBeNull();

            var evt = new UserRegisteredEvent(created!.PersoId, created.Email);

            var evtHandler = new UserRegisteredEventHandler(
                tokens, rl.Object, email.Object, users,
                tokOpts, urls, clock.Object, smtp,
                Mock.Of<Microsoft.Extensions.Logging.ILogger<UserRegisteredEventHandler>>());

            await evtHandler.Handle(evt, CancellationToken.None);

            // Token exists (BINARY(16) -> Guid mapping handled by MySqlConnector/Dapper)
            await using var conn = new MySqlConnection(_db.ConnectionString);
            var tokenRow = await conn.QueryFirstOrDefaultAsync<(Guid Token, Guid PersoId, DateTime Exp)>(
                "SELECT Token, PersoId, TokenExpiryDate AS Exp FROM VerificationToken LIMIT 1;");
            tokenRow.Token.Should().NotBe(Guid.Empty);
            tokenRow.PersoId.Should().Be(created.PersoId);

            // Verify handler
            var verifyHandler = new VerifyEmailCommandHandler(tokens, users, clock.Object,
                Mock.Of<Microsoft.Extensions.Logging.ILogger<VerifyEmailCommandHandler>>());

            var verRes = await verifyHandler.Handle(new VerifyEmailCommand(tokenRow.Token), CancellationToken.None);
            verRes.IsSuccess.Should().BeTrue();

            // Assert: user confirmed & tokens cleared
            var after = await users.GetUserModelAsync(persoid: created.PersoId, ct: CancellationToken.None);
            after!.EmailConfirmed.Should().BeTrue();

            var cnt = await conn.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM VerificationToken;");
            cnt.Should().Be(0);
        }
        finally
        {
            Environment.SetEnvironmentVariable("ALLOW_TEST_EMAILS", null);
        }
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
}
