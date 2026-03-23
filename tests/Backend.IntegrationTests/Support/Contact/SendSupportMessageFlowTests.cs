using System.Text.RegularExpressions;
using Backend.Application.Abstractions.Infrastructure.EmailOutbox;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Support.Contact;
using Backend.Domain.Entities.User;
using Backend.IntegrationTests.Shared;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Backend.Domain.Entities.Email;
using MySqlConnector;
using Moq;
using Backend.Application.Abstractions.Infrastructure.Data;

namespace Backend.IntegrationTests.Support.Contact;

[Collection("it:db")]
public sealed class SendSupportMessageFlowTests
{
    private readonly MariaDbFixture _db;

    public SendSupportMessageFlowTests(MariaDbFixture db)
    {
        _db = db;
    }

    private readonly Mock<ITimeProvider> _clock = new();

    [Fact]
    public async Task Given_ConfirmedUser_When_SupportMessageSent_Then_OutboxRowIsCreated()
    {
        await _db.ResetAsync();

        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var persoid = Guid.NewGuid();

        var users = new SqlUsers(_db.ConnectionString);
        var outbox = new SqlEmailOutbox(_db.ConnectionString);

        await users.CreateUserAsync(new UserModel
        {
            PersoId = persoid,
            FirstName = "Linus",
            LastName = "Steen",
            Email = "linus@example.com",
            Password = "hashed",
            EmailConfirmed = true,
            Roles = "User"
        }, CancellationToken.None);

        var sut = new SendSupportMessageHandler(
            users,
            outbox,
            _clock.Object,
            NullLogger<SendSupportMessageHandler>.Instance
        );

        var command = new SendSupportMessageCommand(
            Persoid: persoid,
            Subject: "Budget import issue",
            Body: "I cannot save my budget after editing categories.",
            Category: "technical",
            IpAddress: "127.0.0.1",
            UserAgent: "it-test-agent"
        );

        var result = await sut.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        await using var conn = new MySqlConnection(_db.ConnectionString);

        var row = await conn.QuerySingleAsync<OutboxRow>(
            """
            SELECT Kind, ToEmail, Subject, BodyHtml, Attempts
            FROM EmailOutbox
            ORDER BY Id DESC
            LIMIT 1;
            """);

        row.Kind.Should().Be("support_message");
        row.ToEmail.Should().Be("support@yourdomain.com");
        row.Subject.Should().Be("[Support:technical] Budget import issue");
        row.Attempts.Should().Be(0);

        row.BodyHtml.Should().Contain("linus@example.com");
        row.BodyHtml.Should().Contain("Budget import issue");
        row.BodyHtml.Should().Contain("I cannot save my budget after editing categories.");
        row.BodyHtml.Should().Contain("127.0.0.1");
        row.BodyHtml.Should().Contain("it-test-agent");
    }

    [Fact]
    public async Task Given_MissingUser_When_SupportMessageSent_Then_Fails_And_NoOutboxRowCreated()
    {
        await _db.ResetAsync();

        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var users = new SqlUsers(_db.ConnectionString);
        var outbox = new SqlEmailOutbox(_db.ConnectionString);

        var sut = new SendSupportMessageHandler(
            users,
            outbox,
            _clock.Object,
            NullLogger<SendSupportMessageHandler>.Instance
        );

        var result = await sut.Handle(
            new SendSupportMessageCommand(
                Persoid: Guid.NewGuid(),
                Subject: "Help",
                Body: "Something broke",
                Category: "technical",
                IpAddress: "127.0.0.1",
                UserAgent: "it-test-agent"
            ),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();

        await using var conn = new MySqlConnection(_db.ConnectionString);

        var count = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM EmailOutbox;");

        count.Should().Be(0);
    }

    [Fact]
    public async Task Given_InvalidMessage_When_SupportMessageSent_Then_Fails_And_NoOutboxRowCreated()
    {
        await _db.ResetAsync();

        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var persoid = Guid.NewGuid();

        var users = new SqlUsers(_db.ConnectionString);
        var outbox = new SqlEmailOutbox(_db.ConnectionString);

        await users.CreateUserAsync(new UserModel
        {
            PersoId = persoid,
            FirstName = "Linus",
            LastName = "Steen",
            Email = "linus@example.com",
            Password = "hashed",
            EmailConfirmed = true,
            Roles = "User"
        }, CancellationToken.None);

        var sut = new SendSupportMessageHandler(
            users,
            outbox,
            _clock.Object,
            NullLogger<SendSupportMessageHandler>.Instance
        );

        var result = await sut.Handle(
            new SendSupportMessageCommand(
                Persoid: persoid,
                Subject: "",
                Body: "Something broke",
                Category: "technical",
                IpAddress: "127.0.0.1",
                UserAgent: "it-test-agent"
            ),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();

        await using var conn = new MySqlConnection(_db.ConnectionString);

        var count = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM EmailOutbox;");

        count.Should().Be(0);
    }

    private sealed class OutboxRow
    {
        public string Kind { get; init; } = default!;
        public string ToEmail { get; init; } = default!;
        public string Subject { get; init; } = default!;
        public string BodyHtml { get; init; } = default!;
        public int Attempts { get; init; }
    }

    private sealed class SqlUsers : IUserRepository
    {
        private readonly string _cs;
        public SqlUsers(string cs) => _cs = cs;

        public async Task<bool> CreateUserAsync(UserModel user, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            var rows = await c.ExecuteAsync("""
                INSERT INTO Users
                  (PersoId, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
                VALUES
                  (@pid, @fn, @ln, @eml, @confirmed, @pwd, @roles, 0, 1, 'it');
                """, new
            {
                pid = user.PersoId,
                fn = user.FirstName ?? "N/A",
                ln = user.LastName ?? "N/A",
                eml = user.Email,
                confirmed = user.EmailConfirmed,
                pwd = user.Password,
                roles = user.Roles ?? "User"
            });

            return rows == 1;
        }

        public async Task<UserModel?> GetUserModelAsync(Guid? persoid = null, string? email = null, CancellationToken ct = default)
        {
            await using var c = new MySqlConnection(_cs);

            if (persoid is not null)
            {
                return await c.QuerySingleOrDefaultAsync<UserModel>(
                    """
                    SELECT Id, PersoId, Firstname AS FirstName, Lastname AS LastName, Email, Password, EmailConfirmed
                    FROM Users
                    WHERE PersoId = @id
                    LIMIT 1;
                    """,
                    new { id = persoid });
            }

            if (email is not null)
            {
                return await c.QuerySingleOrDefaultAsync<UserModel>(
                    """
                    SELECT Id, PersoId, Firstname AS FirstName, Lastname AS LastName, Email, Password, EmailConfirmed
                    FROM Users
                    WHERE Email = @eml
                    LIMIT 1;
                    """,
                    new { eml = email });
            }

            return null;
        }

        public Task<bool> UserExistsAsync(string email, CancellationToken ct) => throw new NotImplementedException();
        public Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct) => throw new NotImplementedException();
        public Task<bool> UpdatePasswordAsync(Guid persoid, string passwordHash, CancellationToken ct) => throw new NotImplementedException();
        public Task<bool> SetFirstTimeLoginAsync(Guid persoid, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> UpsertUserPreferencesAsync(Guid persoid, string locale, string currency, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<UserPreferencesReadModel?> GetUserPreferencesAsync(Guid persoid, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<EmailRegistrationState> GetEmailRegistrationStateAsync(string email, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> UpdateUserProfileAsync(Guid persoId, string firstName, string lastName, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class SqlEmailOutbox : IEmailOutboxRepository
    {
        private readonly string _cs;
        public SqlEmailOutbox(string cs) => _cs = cs;

        public async Task EnqueueAsync(EnqueueEmailOutboxRequest request, CancellationToken ct)
        {
            const string sql = """
            INSERT INTO EmailOutbox
              (Kind, ToEmail, Subject, BodyHtml, Attempts, NextAttemptAtUtc, CreatedAtUtc)
            VALUES
              (@Kind, @ToEmail, @Subject, @BodyHtml, 0, @NowUtc, @NowUtc);
            """;

            await using var conn = new MySqlConnection(_cs);
            await conn.ExecuteAsync(new CommandDefinition(sql, new
            {
                Kind = request.Kind,
                ToEmail = request.ToEmail,
                Subject = request.Subject,
                BodyHtml = request.BodyHtml,
                NowUtc = request.NowUtc
            }, cancellationToken: ct));
        }

        public Task<IReadOnlyList<EmailOutboxItem>> ClaimDueAsync(Guid workerId, int take, DateTime nowUtc, TimeSpan lockFor, CancellationToken ct)
            => Task.FromResult<IReadOnlyList<EmailOutboxItem>>(Array.Empty<EmailOutboxItem>());

        public Task MarkSentAsync(long id, string? providerId, DateTime nowUtc, CancellationToken ct)
            => Task.CompletedTask;

        public Task MarkFailedAsync(MarkEmailOutboxFailedRequest request, CancellationToken ct)
            => Task.CompletedTask;
    }
}