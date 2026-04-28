using System.CommandLine;
using System.Globalization;
using MediatR;
using Backend.Application;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Backend.Application.Features.Authentication.Register.RegisterAndIssueSession;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Domain.Errors.User;
using MySqlConnector;
using Backend.Settings;
using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.Auth;
using Backend.Infrastructure.Auth;

const string DevSeedPassword = "ChangeMe123!";
const string DefaultBudgetOpenYearMonth = "2026-04";
const string DefaultSeedClockUtc = "2026-04-26T12:00:00Z";
const string SeedE2eCommandName = "seed-e2e";

DevSeedUser[] usersOnlySeed =
[
    new(
        Email: "demo1@local.test",
        Password: DevSeedPassword,
        FirstName: "Demo",
        LastName: "One"),
    new(
        Email: "demo2@local.test",
        Password: DevSeedPassword,
        FirstName: "Demo",
        LastName: "Two"),
    new(
        Email: "budgetdemo@local.test",
        Password: DevSeedPassword,
        FirstName: "Budget",
        LastName: "Demo"),
    new(
        Email: "closemonth@local.test",
        Password: DevSeedPassword,
        FirstName: "Close",
        LastName: "Month")
];

DevSeedUser[] budgetSeed =
[
    new(
        Email: "budgetdemo@local.test",
        Password: DevSeedPassword,
        FirstName: "Budget",
        LastName: "Demo"),
    new(
        Email: "closemonth@local.test",
        Password: DevSeedPassword,
        FirstName: "Close",
        LastName: "Month")
];

E2eSeedUser[] e2eSeed =
[
    new(
        User: new DevSeedUser(
            Email: "e2e-login@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "Login"),
        IncludeBudget: false,
        OpenMonthTargetFinalBalance: null),
    new(
        User: new DevSeedUser(
            Email: "e2e-close-balanced@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "Balanced"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: 0m),
    new(
        User: new DevSeedUser(
            Email: "e2e-close-surplus-full@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "Surplus"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: 1250m),
    new(
        User: new DevSeedUser(
            Email: "e2e-close-deficit@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "Deficit"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: -750m)
];

var isE2eSeedCommand = args.Any(arg => string.Equals(arg, SeedE2eCommandName, StringComparison.OrdinalIgnoreCase));
var configuration = BuildConfiguration(isE2eSeedCommand);
var services = new ServiceCollection();
ConfigureServices(services, configuration);
await using var serviceProvider = services.BuildServiceProvider(new ServiceProviderOptions
{
    ValidateOnBuild = false,
    ValidateScopes = false
});

var root = new RootCommand("Admin tools: user seeding");
root.AddCommand(CreateFixedSeedCommand(
    name: "seed-users",
    description: "Seed the fixed local-dev demo users.",
    users: usersOnlySeed,
    includeBudget: false));
root.AddCommand(CreateFixedSeedCommand(
    name: "seed-users-with-budget",
    description: "Seed the fixed local-dev budget demo users with baseline budget data and a fixed 3-month timeline.",
    users: budgetSeed,
    includeBudget: true));
root.AddCommand(CreateE2eSeedCommand());
root.AddCommand(CreateSeedCommand(
    name: "seed-user",
    description: "Seed a user only.",
    includeBudget: false));
root.AddCommand(CreateSeedCommand(
    name: "seed-user-budget",
    description: "Seed a user together with baseline budget data and a 3-month demo timeline.",
    includeBudget: true));

return await root.InvokeAsync(args);

IConfiguration BuildConfiguration(bool forceE2eDatabase)
{
    var environmentName =
        Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
        ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
        ?? Environments.Development;

    var baseConfiguration = new ConfigurationBuilder()
        .SetBasePath(AppContext.BaseDirectory)
        .AddJsonFile("appsettings.json", optional: true)
        .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
        .AddEnvironmentVariables()
        .Build();

    if (!forceE2eDatabase)
        return baseConfiguration;

    var e2eConnectionString = E2eDatabaseSetup.ResolveE2eConnectionString(baseConfiguration);
    return new ConfigurationBuilder()
        .AddConfiguration(baseConfiguration)
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DatabaseSettings:ConnectionString"] = e2eConnectionString
        })
        .Build();
}

void ConfigureServices(IServiceCollection services, IConfiguration config)
{
    var environmentName =
        config["DOTNET_ENVIRONMENT"]
        ?? config["ASPNETCORE_ENVIRONMENT"]
        ?? Environments.Development;

    services.AddSingleton<IConfiguration>(config);
    services.AddSingleton<IHostEnvironment>(new SeedHostEnvironment(environmentName));

    services
        .AddApplicationServices(config)
        .AddInfrastructureServices(config, isProduction: false);

    services.Configure<JwtSettings>(config.GetSection("Jwt"));
    services.AddSingleton(sp => sp.GetRequiredService<IOptions<JwtSettings>>().Value);

    // If anything in infra expects WebSocketSettings as concrete (some codebases do)
    services.AddSingleton(sp => sp.GetRequiredService<IOptions<WebSocketSettings>>().Value);
    services.AddSingleton<IJwtKeyRing, HsKeyRing>();

    // CLI: override the DB connection with a user-provided connection string.
    services.RemoveAll<IUnitOfWork>();
    services.AddScoped<IUnitOfWork>(_ =>
    {
        var cs =
            config["DatabaseSettings:ConnectionString"] ??
            config["ConnectionStrings:Default"];

        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException(
                "DB connection string missing for Backend.Tools. Provide env DATABASESETTINGS__CONNECTIONSTRING.");

        return new CliUnitOfWork(new MySqlConnection(cs));
    });

    services.Configure<WebSocketSettings>(o =>
    {
        o.Secret = config["WEBSOCKET_SECRET"]
            ?? throw new InvalidOperationException("WEBSOCKET_SECRET missing");
    });

    var seedNowUtc = ReadSeedClockUtc(config);
    services.RemoveAll<ITimeProvider>();
    services.AddSingleton<ITimeProvider>(new SeedTimeProvider(seedNowUtc));

    services.AddScoped<BudgetTimelineSeeder>();

    // optional: if you still want concrete injection
    services.AddSingleton(sp => sp.GetRequiredService<IOptions<WebSocketSettings>>().Value);
}

Command CreateFixedSeedCommand(string name, string description, IReadOnlyList<DevSeedUser> users, bool includeBudget)
{
    var command = new Command(name, description);

    command.SetHandler(async () =>
    {
        await using var scope = serviceProvider.CreateAsyncScope();

        Console.WriteLine($"Running {name} with {users.Count} fixed local-dev account(s).");

        foreach (var user in users)
        {
            await SeedOneUserAsync(
                scope.ServiceProvider,
                user,
                includeBudget,
                DefaultBudgetOpenYearMonth,
                CancellationToken.None);
        }

        Console.WriteLine(includeBudget
            ? $"Seeded fixed budget timeline ending in open month {DefaultBudgetOpenYearMonth}."
            : "Seeded fixed local-dev users.");
    });

    return command;
}

Command CreateE2eSeedCommand()
{
    var command = new Command(
        SeedE2eCommandName,
        "Reset the dedicated Playwright E2E database and seed deterministic E2E accounts.");

    command.SetHandler(async () =>
    {
        Console.WriteLine("Preparing dedicated Playwright E2E database.");
        await new E2eDatabaseSetup(configuration).ResetAsync(CancellationToken.None);

        await using var scope = serviceProvider.CreateAsyncScope();

        foreach (var seed in e2eSeed)
        {
            await SeedOneUserAsync(
                scope.ServiceProvider,
                seed.User,
                seed.IncludeBudget,
                DefaultBudgetOpenYearMonth,
                CancellationToken.None,
                seed.OpenMonthTargetFinalBalance);
        }

        Console.WriteLine($"Seeded {e2eSeed.Length} deterministic E2E account(s) in open month {DefaultBudgetOpenYearMonth}.");
    });

    return command;
}

Command CreateSeedCommand(string name, string description, bool includeBudget)
{
    var emailOpt = new Option<string>("--email") { IsRequired = true };
    var passOpt = new Option<string>("--password") { IsRequired = true };
    var firstOpt = new Option<string>("--first", () => "Seeded");
    var lastOpt = new Option<string>("--last", () => "User");
    var suppress = new Option<bool>("--suppress-notify", () => true);

    var command = new Command(name, description);
    command.AddOption(emailOpt);
    command.AddOption(passOpt);
    command.AddOption(firstOpt);
    command.AddOption(lastOpt);
    command.AddOption(suppress);

    command.SetHandler(async (string email, string password, string first, string last, bool sup) =>
    {
        _ = sup;

        await using var scope = serviceProvider.CreateAsyncScope();
        await SeedOneUserAsync(
            scope.ServiceProvider,
            new DevSeedUser(email, password, first, last),
            includeBudget,
            DefaultBudgetOpenYearMonth,
            CancellationToken.None);
    }, emailOpt, passOpt, firstOpt, lastOpt, suppress);

    return command;
}

async Task SeedOneUserAsync(
    IServiceProvider services,
    DevSeedUser seedUser,
    bool includeBudget,
    string openYearMonth,
    CancellationToken ct,
    decimal? openMonthTargetFinalBalance = null)
{
    var mediator = services.GetRequiredService<IMediator>();
    var uow = services.GetRequiredService<IUnitOfWork>();
    var users = services.GetRequiredService<IUserRepository>();

    var registerCmd = new RegisterAndIssueSessionCommand(
        FirstName: seedUser.FirstName,
        LastName: seedUser.LastName,
        Email: seedUser.Email,
        Password: seedUser.Password,
        HumanToken: "",     // ignored in trusted seed
        Honeypot: "",       // ignored in trusted seed
        Locale: "sv-SE",
        RemoteIp: null,
        DeviceId: "seed-cli",
        UserAgent: "backend.tools"
    )
    { IsSeedingOperation = true };

    var result = await mediator.Send(registerCmd, ct);
    if (result.IsSuccess)
    {
        Console.WriteLine($"Created user {seedUser.Email}");
    }
    else if (result.Error.Code == UserErrors.EmailAlreadyExists.Code)
    {
        Console.WriteLine($"User already exists, reusing {seedUser.Email}");
    }
    else
    {
        throw new InvalidOperationException(
            $"Could not seed user {seedUser.Email}: {result.Error.Code} - {result.Error.Description}");
    }

    if (!includeBudget)
        return;

    var user = await users.GetUserModelAsync(email: seedUser.Email, ct: ct);
    if (user is null)
        throw new InvalidOperationException($"Could not resolve user by email: {seedUser.Email}");

    await RunInTransactionAsync(
        uow,
        async () =>
        {
            if (!await users.SetFirstTimeLoginAsync(user.PersoId, ct))
                throw new InvalidOperationException($"Could not set FirstLogin = 0 for user: {seedUser.Email}");
        },
        ct);

    var monthSeeder = services.GetRequiredService<BudgetTimelineSeeder>();
    await monthSeeder.SeedThreeMonthTimelineAsync(
        user.PersoId,
        openYearMonth,
        ct,
        openMonthTargetFinalBalance);

    Console.WriteLine($"Seeded budget data for {seedUser.Email}: 2 closed months + open month {openYearMonth}.");
    Console.WriteLine($"Set Users.FirstLogin = 0 for {seedUser.Email} so the dashboard skips the setup wizard.");
}

static async Task RunInTransactionAsync(IUnitOfWork uow, Func<Task> action, CancellationToken ct)
{
    var startedTransaction = false;

    try
    {
        if (!uow.IsInTransaction)
        {
            await uow.BeginTransactionAsync(ct);
            startedTransaction = true;
        }

        await action();

        if (startedTransaction)
            await uow.CommitAsync(ct);
    }
    catch
    {
        if (startedTransaction && uow.IsInTransaction)
            await uow.RollbackAsync(ct);

        throw;
    }
}

static DateTime ReadSeedClockUtc(Microsoft.Extensions.Configuration.IConfiguration configuration)
{
    var configuredValue = configuration["SEED_CLOCK_UTC"] ?? DefaultSeedClockUtc;
    if (!DateTimeOffset.TryParse(
            configuredValue,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsed))
    {
        throw new InvalidOperationException(
            $"SEED_CLOCK_UTC must be an ISO-8601 UTC date/time. Value: {configuredValue}");
    }

    return parsed.UtcDateTime;
}

internal sealed record DevSeedUser(
    string Email,
    string Password,
    string FirstName,
    string LastName);

internal sealed record E2eSeedUser(
    DevSeedUser User,
    bool IncludeBudget,
    decimal? OpenMonthTargetFinalBalance);

internal sealed class SeedTimeProvider : ITimeProvider
{
    public SeedTimeProvider(DateTime utcNow)
    {
        UtcNow = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
    }

    public DateTime UtcNow { get; }
}

internal sealed class SeedHostEnvironment : IHostEnvironment
{
    public SeedHostEnvironment(string environmentName)
    {
        EnvironmentName = environmentName;
    }

    public string EnvironmentName { get; set; }
    public string ApplicationName { get; set; } = "Backend.Tools";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
