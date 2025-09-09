using System;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.Application.Abstractions.Infrastructure.Data; // IWizardRepository
using Backend.Application.Features.Wizard.SaveStep;
using Backend.Domain.Shared;
using Backend.IntegrationTests.Shared;

namespace Backend.tests.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class SaveWizardStepFlowTests
{
    private readonly MariaDbFixture _db;
    public SaveWizardStepFlowTests(MariaDbFixture db) => _db = db;

    private sealed class FakeValidator : IWizardStepValidator
    {
        public int StepNumber { get; }
        private readonly string _json;
        public FakeValidator(int step, string json) { StepNumber = step; _json = json; }
        public Result<string> ValidateAndSerialize(object stepData) => Result<string>.Success(_json);
    }

    [Fact]
    public async Task Insert_New_Step_Then_Update_Same_Key_Increments_Version_And_Replaces_Data()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        // FK: user + session
        await SeedUserAsync(conn, persoId);
        await conn.ExecuteAsync("""
            INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
            VALUES (@sid, @pid, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, pid = persoId });

        // Build repo mock that runs real SQL for UpsertStepDataAsync only
        var repo = BuildRepoMockForUpsert(_db.ConnectionString);

        // First save (insert)
        var json1 = """{"income":[{"name":"salary","amount":1000}]}""";
        var handler = new SaveWizardStepCommandHandler(repo.Object, new[] { new FakeValidator(1, json1) });

        var res1 = await handler.Handle(new SaveWizardStepCommand(sessionId, 1, 0, new { }, 1), CancellationToken.None);
        res1.IsSuccess.Should().BeTrue();

        var row1 = await conn.QuerySingleAsync<(int Ver, string Data)>(
            "SELECT DataVersion AS Ver, StepData AS Data FROM WizardStepData WHERE WizardSessionId=@sid AND StepNumber=1 AND SubStep=0;",
            new { sid = sessionId });
        row1.Ver.Should().Be(1);
        row1.Data.Should().Be(json1);

        // Second save (update same PK)
        var json2 = """{"income":[{"name":"salary","amount":1337}]}""";
        handler = new SaveWizardStepCommandHandler(repo.Object, new[] { new FakeValidator(1, json2) });

        var res2 = await handler.Handle(new SaveWizardStepCommand(sessionId, 1, 0, new { }, 2), CancellationToken.None);
        res2.IsSuccess.Should().BeTrue();

        var row2 = await conn.QuerySingleAsync<(int Ver, string Data)>(
            "SELECT DataVersion AS Ver, StepData AS Data FROM WizardStepData WHERE WizardSessionId=@sid AND StepNumber=1 AND SubStep=0;",
            new { sid = sessionId });
        row2.Ver.Should().Be(2);
        row2.Data.Should().Be(json2);
    }

    [Fact]
    public async Task Missing_Validator_Does_Not_Write_To_DB()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        await conn.ExecuteAsync("""
            INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
            VALUES (@sid, @pid, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, pid = persoId });

        var repo = BuildRepoMockForUpsert(_db.ConnectionString);
        var handler = new SaveWizardStepCommandHandler(repo.Object, Array.Empty<IWizardStepValidator>());

        var res = await handler.Handle(new SaveWizardStepCommand(sessionId, 5, 0, new { }, 1), CancellationToken.None);
        res.IsSuccess.Should().BeFalse();
        res.Error!.Code.Should().Be("Wizard.ValidatorNotFound");

        var cnt = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM WizardStepData WHERE WizardSessionId=@sid;", new { sid = sessionId });
        cnt.Should().Be(0);
    }

    // ---------- Helpers ----------

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

    /// This mirrors your repo method: Upsert into WizardStepData via PK (WizardSessionId, StepNumber, SubStep)
    private static Mock<IWizardRepository> BuildRepoMockForUpsert(string cs)
    {
        var repo = new Mock<IWizardRepository>(MockBehavior.Strict);

        repo.Setup(r => r.UpsertStepDataAsync(
                It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Returns(async (Guid sid, int step, int sub, string json, int ver, CancellationToken ct) =>
            {
                await using var c = new MySqlConnection(cs);
                var rows = await c.ExecuteAsync("""
                    INSERT INTO WizardStepData (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy)
                    VALUES (@sid, @step, @sub, @data, @ver, 'it')
                    ON DUPLICATE KEY UPDATE
                        StepData    = VALUES(StepData),
                        DataVersion = VALUES(DataVersion),
                        CreatedTime = CURRENT_TIMESTAMP;
                """, new { sid, step, sub, data = json, ver });
                return rows > 0;
            });

        return repo;
    }
}
