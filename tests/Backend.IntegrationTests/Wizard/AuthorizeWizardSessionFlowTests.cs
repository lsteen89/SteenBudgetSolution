using System;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.Application.Abstractions.Infrastructure.Data; // IWizardRepository
using Backend.Application.Features.Wizard.AuthorizeSession;  // AuthorizeWizardSessionQueryHandler
using Backend.IntegrationTests.Shared;

namespace Backend.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class AuthorizeWizardSessionFlowTests
{
    private readonly MariaDbFixture _db;
    public AuthorizeWizardSessionFlowTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task ReturnsTrue_When_UserOwnsSession()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await SeedUserAsync(conn, persoId);
        await SeedSessionAsync(conn, sessionId, persoId);

        var repo = BuildRepoForOwnership(_db.ConnectionString);
        var sut = new AuthorizeWizardSessionQueryHandler(repo.Object);

        var ok = await sut.Handle(new AuthorizeWizardSessionQuery(persoId, sessionId), CancellationToken.None);
        ok.Should().BeTrue();
    }

    [Fact]
    public async Task ReturnsFalse_When_OtherUserOwnsSession()
    {
        await _db.ResetAsync();
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await SeedUserAsync(conn, owner);
        await SeedUserAsync(conn, other);
        await SeedSessionAsync(conn, sessionId, owner);

        var repo = BuildRepoForOwnership(_db.ConnectionString);
        var sut = new AuthorizeWizardSessionQueryHandler(repo.Object);

        var ok = await sut.Handle(new AuthorizeWizardSessionQuery(other, sessionId), CancellationToken.None);
        ok.Should().BeFalse();
    }

    [Fact]
    public async Task ReturnsFalse_When_PersoIdMissing_Or_SessionMissing()
    {
        await _db.ResetAsync();
        var someUser = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await SeedUserAsync(conn, someUser);

        var repo = BuildRepoForOwnership(_db.ConnectionString);
        var sut = new AuthorizeWizardSessionQueryHandler(repo.Object);

        (await sut.Handle(new AuthorizeWizardSessionQuery(null, Guid.NewGuid()), CancellationToken.None)).Should().BeFalse();
        (await sut.Handle(new AuthorizeWizardSessionQuery(Guid.Empty, Guid.NewGuid()), CancellationToken.None)).Should().BeFalse();
        (await sut.Handle(new AuthorizeWizardSessionQuery(someUser, Guid.NewGuid()), CancellationToken.None)).Should().BeFalse();
    }

    // --- Helpers ---

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

    private static Task SeedSessionAsync(MySqlConnection conn, Guid sessionId, Guid persoId) =>
        conn.ExecuteAsync("""
            INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
            VALUES (@sid, @pid, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, pid = persoId });

    // Runs real SQL for DoesUserOwnSessionAsync only
    private static Mock<IWizardRepository> BuildRepoForOwnership(string cs)
    {
        var repo = new Mock<IWizardRepository>(MockBehavior.Strict);
        repo.Setup(r => r.DoesUserOwnSessionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Returns(async (Guid pid, Guid sid, CancellationToken _) =>
            {
                await using var c = new MySqlConnection(cs);
                return await c.ExecuteScalarAsync<bool>(
                    "SELECT EXISTS(SELECT 1 FROM WizardSession WHERE WizardSessionId=@sid AND Persoid=@pid)",
                    new { sid, pid });
            });
        return repo;
    }
}
