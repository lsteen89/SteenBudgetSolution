// tests/Backend.IntegrationTests/Wizard/GetWizardDataFlowTests.cs
using System;
using System.Buffers;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Moq;
using MySqlConnector;
using Xunit;

using Backend.IntegrationTests.Shared;
using Backend.Application.Abstractions.Infrastructure.Data; // IWizardRepository
using Backend.Application.Features.Wizard.GetWizardData;   // GetWizardDataQuery, Handler, WizardSavedDataDTO (adjust if different)

using Backend.Application.DTO.Wizard;
using Backend.Application.Models.Wizard;

namespace Backend.tests.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class GetWizardDataFlowTests
{
    private readonly MariaDbFixture _db;
    public GetWizardDataFlowTests(MariaDbFixture db) => _db = db;

    private static readonly JsonSerializerOptions Camel = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task NoRows_Returns_Null()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        await SeedSessionAsync(conn, sessionId, persoId, currentStep: 1);

        var repo = BuildRepoForGetWizardData(_db.ConnectionString);
        var sut = new GetWizardDataQueryHandler(repo.Object);

        var res = await sut.Handle(new GetWizardDataQuery(sessionId), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();   // implicit Result<T> from your handler
        res.Value.Should().BeNull();
    }

    [Fact]
    public async Task Aggregates_Latest_Per_Substep_And_Merges_Multipart()
    {
        await _db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        // CurrentStep = 2 so SubStep will be computed from step 2’s rows
        await SeedSessionAsync(conn, sessionId, persoId, currentStep: 2);

        // ---------- Insert WizardStepData rows ----------
        // Step 1 (Income) – latest wins
        await InsertStep(conn, sessionId, step: 1, sub: 0,
            json: """{"netSalary":1000}""", ver: 1, updatedUtc: DateTime.UtcNow.AddMinutes(-5));

        await InsertStep(conn, sessionId, step: 1, sub: 0,
            json: """{"netSalary":1337}""", ver: 2, updatedUtc: DateTime.UtcNow.AddMinutes(-1));


        // Step 2 (Expenditure) – multipart objects: match your DTOs
        await InsertStep(conn, sessionId, step: 2, sub: 0,
            json: """{"rent":{"monthlyRent":900}}""", ver: 1, updatedUtc: DateTime.UtcNow.AddMinutes(-3));

        await InsertStep(conn, sessionId, step: 2, sub: 1,
            json: """{"utilities":{"electricity":200}}""", ver: 1, updatedUtc: DateTime.UtcNow.AddMinutes(-2));


        // Step 3 (Savings)
        await InsertStep(conn, sessionId, step: 3, sub: 0,
            json: """{"habits":{"monthlySavings":250}}""",
            ver: 1, updatedUtc: DateTime.UtcNow.AddMinutes(-10));



        // ---------- SUT ----------
        var repo = BuildRepoForGetWizardData(_db.ConnectionString);
        var sut = new GetWizardDataQueryHandler(repo.Object);

        var res = await sut.Handle(new GetWizardDataQuery(sessionId), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        res.Value.Should().NotBeNull();

        var dto = res.Value!;
        dto.DataVersion.Should().Be(2); // highest across latest rows (step1 v2)
        dto.SubStep.Should().Be(1);     // max SubStep for current step = 2

        var incomeJson = JsonSerializer.Serialize(dto.WizardData!.Income, Camel);
        incomeJson.Should().Contain("\"netSalary\":1337");

        var exp = dto.WizardData!.Expenditure!;
        exp.Rent!.MonthlyRent.Should().Be(900);
        exp.Utilities!.Electricity.Should().Be(200);

        dto.WizardData!.Savings.Should().NotBeNull();
        dto.WizardData!.Savings!.Habits!.MonthlySavings.Should().Be(250);

    }

    // ----------------- helpers -----------------

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

    private static Task SeedSessionAsync(MySqlConnection conn, Guid sessionId, Guid persoId, int currentStep) =>
        conn.ExecuteAsync("""
            INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt, UpdatedAt)
            VALUES (@sid, @pid, @curr, UTC_TIMESTAMP(), UTC_TIMESTAMP());
        """, new { sid = sessionId, pid = persoId, curr = currentStep });

    private static Task InsertStep(MySqlConnection conn, Guid sid, int step, int sub, string json, int ver, DateTime updatedUtc) =>
        conn.ExecuteAsync("""
        INSERT INTO WizardStepData
        (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, UpdatedAt)
        VALUES
        (@sid, @step, @sub, @data, @ver, 'it', @upd)
        ON DUPLICATE KEY UPDATE
        StepData = VALUES(StepData),
        DataVersion = VALUES(DataVersion),
        UpdatedAt = VALUES(UpdatedAt);
        """, new { sid, step, sub, data = json, ver, upd = updatedUtc });

    /// Mock that executes the real SQL + assembly logic for GetWizardDataAsync.
    private static Mock<IWizardRepository> BuildRepoForGetWizardData(string cs)
    {
        var repo = new Mock<IWizardRepository>(MockBehavior.Strict);

        repo.Setup(r => r.GetWizardDataAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Returns(async (Guid sessionId, CancellationToken ct) =>
            {
                await using var c = new MySqlConnection(cs);
                var raw = (await c.QueryAsync<WizardStepRow>(
                    @"SELECT StepNumber, SubStep, StepData, DataVersion, UpdatedAt
                      FROM WizardStepData
                      WHERE WizardSessionId=@sid;", new { sid = sessionId }))
                    .ToList();

                if (!raw.Any()) return (WizardSavedDataDTO?)null;

                // latest per substep by UpdatedAt
                var latest = raw
                    .GroupBy(e => new { e.StepNumber, e.SubStep })
                    .Select(g => g.OrderByDescending(e => e.UpdatedAt).First())
                    .ToLookup(r => r.StepNumber);

                var highestVersion = latest.SelectMany(x => x).Max(r => r.DataVersion);

                var data = new WizardData();
                if (latest.Contains(1)) data.Income = Assemble<IncomeFormValues>(latest[1], isMultiPart: false);
                if (latest.Contains(2)) data.Expenditure = Assemble<ExpenditureFormValues>(latest[2], isMultiPart: true);
                if (latest.Contains(3)) data.Savings = Assemble<SavingsFormValues>(latest[3], isMultiPart: true);
                if (latest.Contains(4)) data.Debts = Assemble<DebtsFormValues>(latest[4], isMultiPart: true);

                // current-step substep: MAX(SubStep) where StepNumber = WizardSession.CurrentStep
                var currentStep = await c.ExecuteScalarAsync<int>(
                    "SELECT CurrentStep FROM WizardSession WHERE WizardSessionId=@sid;", new { sid = sessionId });
                var sub = await c.ExecuteScalarAsync<int?>(
                    "SELECT MAX(SubStep) FROM WizardStepData WHERE WizardSessionId=@sid AND StepNumber=@st;",
                    new { sid = sessionId, st = currentStep }) ?? 0;

                return new WizardSavedDataDTO
                {
                    WizardData = data,
                    DataVersion = highestVersion,
                    SubStep = sub
                };
            });

        return repo;

        // local helpers
        static T? Assemble<T>(IEnumerable<WizardStepRow> rows, bool isMultiPart)
        {
            if (!rows.Any()) return default;

            if (!isMultiPart)
            {
                var newest = rows.OrderByDescending(r => r.UpdatedAt).First();
                return JsonSerializer.Deserialize<T>(newest.StepData, Camel);
            }
            else
            {
                var buffer = new ArrayBufferWriter<byte>();
                using var writer = new Utf8JsonWriter(buffer);
                writer.WriteStartObject();
                foreach (var r in rows.OrderBy(r => r.SubStep))
                {
                    using var doc = JsonDocument.Parse(r.StepData);
                    foreach (var p in doc.RootElement.EnumerateObject())
                        p.WriteTo(writer);
                }
                writer.WriteEndObject();
                writer.Flush();
                return JsonSerializer.Deserialize<T>(buffer.WrittenSpan, Camel);
            }
        }
    }

    // dumb row to map raw SQL
    private sealed class WizardStepRow
    {
        public int StepNumber { get; init; }
        public int SubStep { get; init; }
        public string StepData { get; init; } = default!;
        public int DataVersion { get; init; }
        public DateTime UpdatedAt { get; init; }
    }
}
