using Dapper;
using FluentAssertions;
using MySqlConnector;
using Xunit;
using Backend.IntegrationTests.Shared;

namespace Backend.tests.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class WizardStepUpsertFlowTests
{
    private readonly MariaDbFixture _db;
    public WizardStepUpsertFlowTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task Insert_Then_Update_SameStep_Increments_Version_And_Replaces_Data()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        // parent user + session
        await SeedUserAsync(conn, persoId);
        await conn.ExecuteAsync("""
            INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
            VALUES (@sid, @pid, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, pid = persoId });

        var step = 1; var sub = 0;

        // 1) insert v1
        var v1 = 1;
        var json1 = """{"income":[{"name":"salary","amount":1000}]}""";
        await UpsertStepAsync(conn, sessionId, step, sub, json1, v1);

        var row1 = await conn.QuerySingleAsync<(int DataVersion, string StepData)>(
            "SELECT DataVersion, StepData FROM WizardStepData WHERE WizardSessionId=@sid AND StepNumber=@st AND SubStep=@sub;",
            new { sid = sessionId, st = step, sub });
        row1.DataVersion.Should().Be(v1);
        row1.StepData.Should().Be(json1);

        // 2) update to v2
        var v2 = v1 + 1;
        var json2 = """{"income":[{"name":"salary","amount":1337}]}""";
        await UpsertStepAsync(conn, sessionId, step, sub, json2, v2);

        var row2 = await conn.QuerySingleAsync<(int DataVersion, string StepData)>(
            "SELECT DataVersion, StepData FROM WizardStepData WHERE WizardSessionId=@sid AND StepNumber=@st AND SubStep=@sub;",
            new { sid = sessionId, st = step, sub });
        row2.DataVersion.Should().Be(v2);
        row2.StepData.Should().Be(json2);
    }

    [Fact]
    public async Task Insert_Step_For_Missing_Session_Should_Fail_FK()
    {
        await _db.ResetAsync();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var missingSession = Guid.NewGuid();
        Func<Task> act = async () =>
        {
            await UpsertStepAsync(conn, missingSession, 1, 0, "{}", 1);
        };

        await act.Should().ThrowAsync<MySqlException>()
            .Where(ex => ex.SqlState == "23000"); // FK violation
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

    /// Simulates your repo's UpsertStepDataAsync(sessionId, step, subStep, json, dataVersion)
    private static async Task UpsertStepAsync(MySqlConnection conn, Guid sessionId, int step, int sub, string json, int dataVersion)
    {
        await conn.ExecuteAsync("""
            INSERT INTO WizardStepData (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy)
            VALUES (@sid, @step, @sub, @data, @ver, 'it')
            ON DUPLICATE KEY UPDATE
                StepData    = VALUES(StepData),
                DataVersion = VALUES(DataVersion),
                CreatedTime = CURRENT_TIMESTAMP;
        """, new { sid = sessionId, step, sub, data = json, ver = dataVersion });
    }
}
