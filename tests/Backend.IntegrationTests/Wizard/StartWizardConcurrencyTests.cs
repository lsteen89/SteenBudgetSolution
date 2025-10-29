
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.Application.Abstractions.Infrastructure.Data; // IWizardRepository
using Backend.Application.Features.Wizard.StartWizard;
using Backend.IntegrationTests.Shared;

namespace Backend.tests.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class StartWizardConcurrencyTests
{
    private readonly MariaDbFixture _db;
    public StartWizardConcurrencyTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task Given_TwoConcurrentStarts_When_SameUser_Then_ExactlyOneRowAndSameSession()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        // FK parent
        await SeedUserAsync(conn, persoId);

        var repo = BuildRepoMockForConcurrency(_db.ConnectionString);
        var log = new Mock<ILogger<StartWizardCommandHandler>>();
        var sut = new StartWizardCommandHandler(repo.Object, log.Object);

        // run two starts concurrently
        var cmd = new StartWizardCommand(persoId);
        var t1 = sut.Handle(cmd, CancellationToken.None);
        var t2 = sut.Handle(cmd, CancellationToken.None);
        await Task.WhenAll(t1, t2);

        var r1 = t1.Result; var r2 = t2.Result;
        r1.IsSuccess.Should().BeTrue();
        r2.IsSuccess.Should().BeTrue();
        r1.Value.WizardSessionId.Should().Be(r2.Value.WizardSessionId);

        var count = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM WizardSession WHERE Persoid=@p;", new { p = persoId });
        count.Should().Be(1);
    }

    // ---------- helpers ----------

    private static async Task SeedUserAsync(MySqlConnection conn, Guid persoId)
    {
        var pwd = BCrypt.Net.BCrypt.HashPassword("dummy");
        await conn.ExecuteAsync("""
            INSERT INTO Users
                (Persoid, Firstname, Lastname, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES
                (@pid, 'Test', 'User', @eml, 1, @pwd, 'User', 0, 0, 'it');
        """, new { pid = persoId, eml = $"{persoId:N}@example.com", pwd });
    }

    /// Mock only the two methods the handler uses, but implement with real SQL and
    /// handle the race via UNIQUE(Persoid): on 1062, read existing SessionId.
    private static Mock<IWizardRepository> BuildRepoMockForConcurrency(string cs)
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
                try
                {
                    var rows = await c.ExecuteAsync("""
                        INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
                        VALUES (@sid, @pid, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
                    """, new { sid, pid });
                    return rows == 1 ? sid : Guid.Empty;
                }
                catch (MySqlException ex) when (ex.Number == 1062) // duplicate Persoid
                {
                    // someone else inserted; return the existing session
                    var existing = await c.QuerySingleAsync<Guid>(
                        "SELECT WizardSessionId FROM WizardSession WHERE Persoid=@p LIMIT 1;", new { p = pid });
                    return existing;
                }
            });

        // Unused members throw if touched
        repo.SetupAllProperties(); // avoid Moq noise
        return repo;
    }
}
