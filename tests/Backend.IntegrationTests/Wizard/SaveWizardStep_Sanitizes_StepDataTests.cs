using System;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using MySqlConnector;

using Microsoft.Extensions.Options;
using Backend.Settings;
using Backend.Infrastructure.Data.Repositories;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Application.Abstractions.Infrastructure.Data; // IUnitOfWork

using Backend.IntegrationTests.Shared;
using Backend.Application.Features.Wizard.SaveStep;
using Backend.Application.Models.Wizard;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Backend.Application.Abstractions.Application.Services.Security; // IPasswordService   
using Backend.Application.Common.Behaviors;

namespace Backend.IntegrationTests.Wizard;

[Collection("it:db")]
public sealed class SaveWizardStep_Sanitizes_CustomExpensesTests : IntegrationTestBase
{

    public SaveWizardStep_Sanitizes_CustomExpensesTests(MariaDbFixture db) : base(db)
    {

    }
    [Fact]
    public async Task SaveStep1_Drops_Empty_IncomeItem_Rows()
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
          "netSalary": 25000,
          "salaryFrequency": "Monthly",
          "householdMembers": [
            { "id":"a", "name":"", "income": null, "frequency": null },
            { "id":"b", "name":" Anna ", "income": 5000, "frequency": "Monthly" }
          ],
          "sideHustles": [
            { "id":"c", "name":"", "income": null, "frequency": null },
            { "id":"d", "name":" Freelance ", "income": 1000, "frequency": "Monthly" }
          ]
        }
        """;

        await using var sp = BuildSp();
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var res = await mediator.Send(
            new SaveWizardStepCommand(
                SessionId: sessionId,
                StepNumber: 1,
                SubStepNumber: 1,
                StepData: payload,
                DataVersion: 1),
            CancellationToken.None);

        res.IsSuccess.Should().BeTrue();

        var savedJson = await conn.ExecuteScalarAsync<string>(@"
            SELECT StepData
            FROM WizardStepData
            WHERE WizardSessionId=@sid AND StepNumber=1 AND SubStep=1
        ", new { sid = sessionId });

        // ✅ Keeps valid trimmed rows
        savedJson.Should().Contain("\"name\":\"Anna\"");
        savedJson.Should().Contain("\"name\":\"Freelance\"");

        // ✅ Drops the truly empty ones
        savedJson.Should().NotContain("\"id\":\"a\"");
        savedJson.Should().NotContain("\"id\":\"c\"");
    }
    [Fact]
    public async Task SaveStep1_Fails_When_Partial_IncomeRow_Is_Sent()
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
      "netSalary": 25000,
      "salaryFrequency": "Monthly",
      "sideHustles": [
        { "id":"x", "name":"", "income": 500, "frequency": "Monthly" }
      ]
    }
    """;

        await using var sp = BuildSp();
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var res = await mediator.Send(
            new SaveWizardStepCommand(sessionId, 1, 1, payload, 1),
            CancellationToken.None);

        res.IsFailure.Should().BeTrue();
        res.Error.Code.Should().Be("Validation.Failed");
        res.Error.Message.Should().Contain("Ange ett namn");
    }
    [Fact]
    public async Task SaveStep2_Drops_Empty_CustomExpenses_Rows()
    {
        await Db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(Db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        await SeedSessionAsync(conn, sessionId, persoId, currentStep: 2);

        var payload = """
    {
      "fixedExpenses": {
        "insurance": 200,
        "customExpenses": [
          { "id":"a", "name":"", "cost": null },
          { "id":"b", "name":" Forskola ", "cost": 1500 }
        ]
      }
    }
    """;

        await using var sp = BuildSp();
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var res = await mediator.Send(
            new SaveWizardStepCommand(
                SessionId: sessionId,
                StepNumber: 2,
                SubStepNumber: 3,
                StepData: payload,
                DataVersion: 1),
            CancellationToken.None);

        res.IsSuccess.Should().BeTrue();

        var savedJson = await conn.ExecuteScalarAsync<string>(@"
        SELECT StepData
        FROM WizardStepData
        WHERE WizardSessionId=@sid AND StepNumber=2 AND SubStep=3
    ", new { sid = sessionId });

        savedJson.Should().Contain("\"name\":\"Forskola\"");
        savedJson.Should().NotContain("\"id\":\"a\"");
        savedJson.Should().NotContain("\"name\":\"\"");
    }
    [Fact]
    public async Task SaveStep2_Drops_Empty_CustomSubscriptions_Rows()
    {
        await Db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(Db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        await SeedSessionAsync(conn, sessionId, persoId, currentStep: 2);

        var payload = """
    {
      "subscriptions": {
        "netflix": 149,
        "customSubscriptions": [
          { "id":"a", "name":"", "cost": null },
          { "id":"b", "name":" iCloud ", "cost": 35 }
        ]
      }
    }
    """;

        await using var sp = BuildSp();
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var res = await mediator.Send(
            new SaveWizardStepCommand(
                SessionId: sessionId,
                StepNumber: 2,
                SubStepNumber: 6,
                StepData: payload,
                DataVersion: 1),
            CancellationToken.None);

        res.IsSuccess.Should().BeTrue();

        var savedJson = await conn.ExecuteScalarAsync<string>(@"
        SELECT StepData
        FROM WizardStepData
        WHERE WizardSessionId=@sid AND StepNumber=2 AND SubStep=6
    ", new { sid = sessionId });

        // ✅ Keeps valid trimmed rows
        savedJson.Should().Contain("\"name\":\"iCloud\"");
        savedJson.Should().Contain("\"cost\":35");

        // ✅ Drops the truly empty one
        savedJson.Should().NotContain("\"id\":\"a\"");
        savedJson.Should().NotContain("\"name\":\"\"");
    }

    [Fact]
    public async Task SaveStep2_Fails_When_Partial_CustomSubscriptionRow_Is_Sent()
    {
        await Db.ResetAsync();
        var persoId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await using var conn = new MySqlConnection(Db.ConnectionString);
        await conn.OpenAsync();

        await SeedUserAsync(conn, persoId);
        await SeedSessionAsync(conn, sessionId, persoId, currentStep: 2);

        var payload = """
    {
      "subscriptions": {
        "customSubscriptions": [
          { "id":"x", "name":"", "cost": 49 }
        ]
      }
    }
    """;

        await using var sp = BuildSp();
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var res = await mediator.Send(
            new SaveWizardStepCommand(
                SessionId: sessionId,
                StepNumber: 2,
                SubStepNumber: 6,
                StepData: payload,
                DataVersion: 1),
            CancellationToken.None);

        res.IsFailure.Should().BeTrue();
        res.Error.Code.Should().Be("Validation.Failed");

        // ✅ message depends on your BE validator text, but should contain this
        res.Error.Message.Should().Contain("Ange ett namn");
    }

    // ----------------- composition root -----------------

    private ServiceProvider BuildSp()
    {
        var services = new ServiceCollection();

        services.AddLogging();

        services.AddSingleton(Options.Create(new DatabaseSettings
        {
            ConnectionString = Db.ConnectionString,
            DefaultCommandTimeoutSeconds = 30
        }));

        services.AddScoped<IUnitOfWork, UnitOfWork>();                  // your concrete
        services.AddScoped<IWizardRepository, WizardRepository>();


        services.AddSingleton<IValidator<ExpenditureFormValues>, ExpenditureValidator>();
        services.AddSingleton<IWizardStepValidator>(sp =>
            new ExpenditureStepValidator(sp.GetRequiredService<IValidator<ExpenditureFormValues>>()));

        services.AddSingleton<IValidator<IncomeFormValues>, IncomeValidator>();
        services.AddSingleton<IWizardStepValidator>(sp =>
            new IncomeStepValidator(sp.GetRequiredService<IValidator<IncomeFormValues>>()));

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<SaveWizardStepCommandHandler>());

        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(UnitOfWorkPipelineBehavior<,>));

        services.AddSingleton(NullLogger<SaveWizardStepCommandHandler>.Instance);
        services.AddSingleton(NullLogger<WizardRepository>.Instance);
        services.AddSingleton(NullLogger<UnitOfWork>.Instance);

        return services.BuildServiceProvider();
    }

    // ----------------- seed helpers (reuse from your other test file) -----------------
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
}
