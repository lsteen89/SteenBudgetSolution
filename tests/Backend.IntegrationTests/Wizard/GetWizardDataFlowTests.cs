using System;
using System.Buffers;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using FluentValidation;
using Moq;
using MySqlConnector;
using Backend.Domain.Entities.Wizard;

using Backend.IntegrationTests.Shared;
using Backend.Application.Abstractions.Infrastructure.Data; // IWizardRepository
using Backend.Application.Features.Wizard.GetWizardData;
using Backend.Application.Features.Wizard.GetWizardData.Assemble;
using Backend.Application.Features.Wizard.GetWizardData.Reduce;
using Backend.Application.Features.Wizard.SaveStep;
using Backend.Application.Models.Wizard;
using Backend.Infrastructure.Data.Repositories;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Settings;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Backend.Application.Abstractions.Application.Services.Security; // IPasswordService

namespace Backend.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class GetWizardDataFlowTests : IntegrationTestBase
{

    public GetWizardDataFlowTests(MariaDbFixture db) : base(db) { }

    private static readonly JsonSerializerOptions Camel = new(JsonSerializerDefaults.Web);

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings { ConnectionString = cs });

    [Fact]
    public async Task NoRows_Returns_Null()
    {
        await Db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(Db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        await SeedSessionAsync(conn, sessionId, persoId, currentStep: 1);

        var repo = new TestWizardRepository(Db.ConnectionString);
        var reducer = new WizardStepRowReducer();
        var assembler = new WizardStepDataAssembler();
        var sut = new GetWizardDataQueryHandler(repo, reducer, assembler);

        var res = await sut.Handle(new GetWizardDataQuery(sessionId), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        res.Value.Should().BeNull();
    }


    [Fact]
    public async Task Aggregates_Latest_Per_Substep_And_Merges_Multipart()
    {
        await Db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(Db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        await SeedSessionAsync(conn, sessionId, persoId, currentStep: 2);

        await InsertStep(conn, sessionId, step: 1, sub: 0,
            json: """{"netSalary":1000}""", ver: 1, updatedUtc: DateTime.UtcNow.AddMinutes(-5));

        await InsertStep(conn, sessionId, step: 1, sub: 0,
            json: """{"netSalary":1337}""", ver: 2, updatedUtc: DateTime.UtcNow.AddMinutes(-1));

        await InsertStep(conn, sessionId, step: 2, sub: 2,
            json: """
        {
          "housing": {
            "homeType": "rent",
            "payment": { "monthlyRent": 900, "extraFees": 50 },
            "runningCosts": { "electricity": 200 }
          }
        }
        """,
            ver: 1, updatedUtc: DateTime.UtcNow.AddMinutes(-2));

        await InsertStep(conn, sessionId, step: 3, sub: 0,
            json: """{"habits":{"monthlySavings":250}}""",
            ver: 1, updatedUtc: DateTime.UtcNow.AddMinutes(-10));

        var repo = new TestWizardRepository(Db.ConnectionString);
        var reducer = new WizardStepRowReducer();
        var assembler = new WizardStepDataAssembler();
        var sut = new GetWizardDataQueryHandler(repo, reducer, assembler);

        var res = await sut.Handle(new GetWizardDataQuery(sessionId), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        res.Value.Should().NotBeNull();

        var dto = res.Value!;
        dto.DataVersion.Should().Be(2);
        dto.Progress.MajorStep.Should().Be(2);
        dto.Progress.SubStep.Should().Be(2);

        JsonSerializer.Serialize(dto.WizardData!.Income, Camel)
            .Should().Contain("\"netSalary\":1337");

        var exp = dto.WizardData!.Expenditure!;
        exp.Housing!.HomeType.Should().Be("rent");
        exp.Housing.Payment!.MonthlyRent.Should().Be(900);
        exp.Housing.Payment.ExtraFees.Should().Be(50);
        exp.Housing.RunningCosts!.Electricity.Should().Be(200);

        dto.WizardData!.Savings!.Habits!.MonthlySavings.Should().Be(250);
    }

    [Fact]
    public async Task SaveWizardStep_WithIncomePaymentDayFields_PersistsAndReturnsThem()
    {
        await Db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(Db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        await SeedSessionAsync(conn, sessionId, persoId, currentStep: 1);

        var payload = """
        {
          "netSalary": 30000,
          "salaryFrequency": "Monthly",
          "incomePaymentDayType": "dayOfMonth",
          "incomePaymentDay": 21,
          "householdMembers": [],
          "sideHustles": []
        }
        """;

        var dbOpts = DbOptions(Db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new WizardRepository(uow, NullLogger<WizardRepository>.Instance, dbOpts);
        var validator = new IncomeStepValidator(new IncomeValidator());
        var saveHandler = new SaveWizardStepCommandHandler(
            repo,
            new[] { validator },
            NullLogger<SaveWizardStepCommandHandler>.Instance);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var saveResult = await saveHandler.Handle(
            new SaveWizardStepCommand(sessionId, 1, 0, payload, 1),
            CancellationToken.None);

        if (saveResult.IsSuccess) await uow.CommitAsync(CancellationToken.None);
        else await uow.RollbackAsync(CancellationToken.None);

        saveResult.IsSuccess.Should().BeTrue();

        var reducer = new WizardStepRowReducer();
        var assembler = new WizardStepDataAssembler();
        var getHandler = new GetWizardDataQueryHandler(repo, reducer, assembler);

        var getResult = await getHandler.Handle(new GetWizardDataQuery(sessionId), CancellationToken.None);

        getResult.IsSuccess.Should().BeTrue();
        getResult.Value.Should().NotBeNull();

        var income = getResult.Value!.WizardData!.Income!;
        income.IncomePaymentDayType.Should().Be("dayOfMonth");
        income.IncomePaymentDay.Should().Be(21);
        income.NetSalary.Should().Be(30000m);
    }


    // ----------------- helpers -----------------

    private async Task SeedUserAsync(MySqlConnection conn, Guid persoId)
    {
        var pwd = PasswordService.Hash("dummy");
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
    private sealed class TestWizardRepository : IWizardRepository
    {
        private readonly string _cs;
        public TestWizardRepository(string cs) => _cs = cs;

        public async Task<IReadOnlyList<WizardStepRowEntity>> GetRawWizardStepDataAsync(Guid sessionId, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            var rows = await c.QueryAsync<WizardStepRowEntity>(
                new CommandDefinition(
                    @"SELECT StepNumber, SubStep, StepData, DataVersion, UpdatedAt
                  FROM WizardStepData
                  WHERE WizardSessionId=@sid;",
                    new { sid = sessionId },
                    cancellationToken: ct));

            return rows.ToList();
        }

        public async Task<(int majorStep, int subStep)> GetCurrentStepAsync(Guid sessionId, CancellationToken ct)
        {
            await using var c = new MySqlConnection(_cs);
            var majorStep = await c.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "SELECT CurrentStep FROM WizardSession WHERE WizardSessionId=@sid;",
                    new { sid = sessionId },
                    cancellationToken: ct));

            var subStep = await c.ExecuteScalarAsync<int?>(
                new CommandDefinition(
                    @"SELECT MAX(SubStep)
                  FROM WizardStepData
                  WHERE WizardSessionId=@sid AND StepNumber=@st;",
                    new { sid = sessionId, st = majorStep },
                    cancellationToken: ct)) ?? 0;

            return (majorStep, subStep);
        }

        // --- Stubs for unused methods in this test context ---
        public Task<Guid?> GetSessionIdByPersoIdAsync(Guid persoId, CancellationToken ct) => throw new NotImplementedException();
        public Task<Guid> CreateSessionAsync(Guid persoId, CancellationToken ct) => throw new NotImplementedException();
        public Task<bool> UpsertStepDataAsync(Guid wizardSessionId, int stepNumber, int substepNumber, string jsonData, int dataVersion, CancellationToken ct) => throw new NotImplementedException();
        public Task<bool> DoesUserOwnSessionAsync(Guid userId, Guid sessionId, CancellationToken ct) => throw new NotImplementedException();
        public Task<IEnumerable<WizardStepRowEntity>> GetRawStepDataForFinalizationAsync(Guid sessionId, CancellationToken ct) => throw new NotImplementedException();
        public Task<bool> DeleteSessionAsync(Guid sessionId, CancellationToken ct) => throw new NotImplementedException();
        public Task<bool> HasAnyStepDataAsync(Guid sessionId, CancellationToken ct) => throw new NotImplementedException();

        // Explicit implementation to satisfy the original interface if names differ slightly
        async Task<IEnumerable<WizardStepRowEntity>> IWizardRepository.GetRawWizardStepDataAsync(Guid sessionId, CancellationToken ct)
            => await GetRawWizardStepDataAsync(sessionId, ct);
    }

}
