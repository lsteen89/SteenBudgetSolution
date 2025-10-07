using System;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.Application.Abstractions.Infrastructure.Data; // IWizardRepository
using Backend.Application.Features.Wizard.StartWizard;      // StartWizardCommandHandler
using Backend.Domain.Shared;                                // Result<T>
using Backend.IntegrationTests.Shared;                      // MariaDbFixture

namespace Backend.tests.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class StartWizardFlowTests
{
    private readonly MariaDbFixture _db;
    public StartWizardFlowTests(MariaDbFixture db) => _db = db;

    private static StartWizardCommandHandler SUT(IWizardRepository repo, Mock<ILogger<StartWizardCommandHandler>> log)
        => new(repo, log.Object);

    [Fact]
    public async Task Given_NoExistingSession_When_Start_Then_Create_And_Reuse_On_Subsequent_Calls()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();
        using var conn = new MySqlConnection(_db.ConnectionString);
        await SeedUserAsync(conn, persoId);
        await conn.ExecuteAsync("DELETE FROM WizardSession WHERE Persoid=@p;", new { p = persoId });

        var repo = BuildRepoMock(_db.ConnectionString);
        var log = new Mock<ILogger<StartWizardCommandHandler>>();
        var sut = SUT(repo.Object, log);

        // First start -> create
        var res1 = await sut.Handle(new StartWizardCommand(persoId), CancellationToken.None);
        res1.IsSuccess.Should().BeTrue();
        res1.Value.Should().NotBe(Guid.Empty);

        // DB has exactly one row with that session
        var count = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM WizardSession WHERE Persoid=@p;", new { p = persoId });
        count.Should().Be(1);

        var sidDb = await conn.ExecuteScalarAsync<Guid>(
            "SELECT WizardSessionId FROM WizardSession WHERE Persoid=@p LIMIT 1;", new { p = persoId });
        sidDb.Should().Be(res1.Value.WizardSessionId);
        //Test

        // Second start -> reuse (idempotent)
        var res2 = await sut.Handle(new StartWizardCommand(persoId), CancellationToken.None);
        res2.IsSuccess.Should().BeTrue();
        res2.Value.Should().Be(res1.Value);

        // Still one row
        var count2 = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM WizardSession WHERE Persoid=@p;", new { p = persoId });
        count2.Should().Be(1);

        log.VerifyLogged(LogLevel.Information, "Creating new wizard session", Times.Once());
        log.VerifyLogged(LogLevel.Information, "already has wizard session", Times.Once());
    }

    [Fact]
    public async Task Given_ExistingSession_When_Start_Then_Return_Existing_Without_Insert()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();
        var existingSession = Guid.NewGuid();

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await SeedUserAsync(conn, persoId);
            await conn.ExecuteAsync("""
                INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
                VALUES (@sid, @pid, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
            """, new { sid = existingSession, pid = persoId });
        }

        var repo = BuildRepoMock(_db.ConnectionString);
        var log = new Mock<ILogger<StartWizardCommandHandler>>();
        var sut = SUT(repo.Object, log);

        var res = await sut.Handle(new StartWizardCommand(persoId), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        res.Value.Should().Be(existingSession);

        // Still exactly one row
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            var count = await conn.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM WizardSession WHERE Persoid=@p;", new { p = persoId });
            count.Should().Be(1);
        }

        log.VerifyLogged(LogLevel.Information, "already has wizard session", Times.Once());
        log.VerifyLogged(LogLevel.Information, "Creating new wizard session", Times.Never());
    }

    // -------- repo mock that runs real SQL for only the used members --------

    private static Mock<IWizardRepository> BuildRepoMock(string cs)
    {
        var repo = new Mock<IWizardRepository>(MockBehavior.Strict);

        repo.Setup(r => r.GetSessionIdByPersoIdAsync(
                It.IsAny<Guid>(),
                It.IsAny<CancellationToken>()))
            .Returns(async (Guid pid, CancellationToken ct) =>
            {
                await using var c = new MySqlConnection(cs);
                return await c.QuerySingleOrDefaultAsync<Guid?>(
                    "SELECT WizardSessionId FROM WizardSession WHERE Persoid=@p LIMIT 1;", new { p = pid });
            });

        repo.Setup(r => r.CreateSessionAsync(
                It.IsAny<Guid>(),
                It.IsAny<CancellationToken>()))
            .Returns(async (Guid pid, CancellationToken ct) =>
            {
                var sid = Guid.NewGuid();
                await using var c = new MySqlConnection(cs);
                var rows = await c.ExecuteAsync("""
                    INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
                    VALUES (@sid, @pid, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
                """, new { sid, pid });
                return rows == 1 ? sid : Guid.Empty;
            });

        // Unused members: keep strict but provide default throws so we know if handler touches them
        repo.Setup(r => r.UpsertStepDataAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Throws(new NotSupportedException("Not used in StartWizard tests."));
        repo.Setup(r => r.DoesUserOwnSessionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Throws(new NotSupportedException("Not used in StartWizard tests."));
        repo.Setup(r => r.GetWizardDataAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Throws(new NotSupportedException("Not used in StartWizard tests."));
        repo.Setup(r => r.GetRawStepDataForFinalizationAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Throws(new NotSupportedException("Not used in StartWizard tests."));

        return repo;
    }
    private static async Task SeedUserAsync(MySqlConnection conn, Guid persoId)
    {
        var pwd = BCrypt.Net.BCrypt.HashPassword("dummy");
        await conn.ExecuteAsync("""
            INSERT INTO Users
                (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES
                (@pid, 'Test', 'User', @eml, 1, @pwd, 'User', 0, 0, 'it');
        """, new
        {
            pid = persoId,
            eml = $"{persoId:N}@example.com",
            pwd
        });
    }
}

// ---- logger helper ----
internal static class LoggerMoqExtensions
{
    public static void VerifyLogged<T>(
        this Mock<ILogger<T>> logger,
        LogLevel level,
        string containsSubstring,
        Times times)
    {
        logger.Verify(l => l.Log(
                level,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, _) =>
                    v.ToString() != null && v.ToString()!.Contains(containsSubstring, StringComparison.OrdinalIgnoreCase)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            times);
    }
}


