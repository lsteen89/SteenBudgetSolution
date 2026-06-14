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
using Microsoft.Extensions.Logging;
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

LocalBudgetSeedUser[] budgetSeed =
[
    new(
        User: new DevSeedUser(
            Email: "budgetdemo@local.test",
            Password: DevSeedPassword,
            FirstName: "Budget",
            LastName: "Demo"),
        Profile: null),
    new(
        User: new DevSeedUser(
            Email: "closemonth@local.test",
            Password: DevSeedPassword,
            FirstName: "Close",
            LastName: "Month"),
        Profile: null),
    new(
        User: new DevSeedUser(
            Email: "devhistory@local.test",
            Password: DevSeedPassword,
            FirstName: "Dev",
            LastName: "History"),
        Profile: BudgetTimelineProfiles.LocalDevYearHistory)
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
            Email: "e2e-close-modal-balanced@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "ModalBalanced"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: 0m),
    new(
        User: new DevSeedUser(
            Email: "e2e-close-modal-surplus-none@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "ModalSurplusNone"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: 1250m),
    new(
        User: new DevSeedUser(
            Email: "e2e-close-modal-surplus-carryover@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "ModalSurplusCarryOver"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: 1250m),
    new(
        User: new DevSeedUser(
            Email: "e2e-carry-over-dashboard@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "CarryOverDashboard"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: 1250m),
    new(
        User: new DevSeedUser(
            Email: "e2e-close-modal-deficit@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "ModalDeficit"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: -750m),
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
        OpenMonthTargetFinalBalance: -750m),
    // Dedicated read-only dashboard-state fixtures for the DP5 visual-polish
    // suite. Unlike close-deficit / close-modal-balanced (which close-month
    // specs CLOSE, rolling their open month forward to a positive template),
    // these users are mutated by no test, so their open month stays a deficit /
    // zero and the dashboard reliably lands on it. Do NOT use them in any
    // close / mutate flow.
    new(
        User: new DevSeedUser(
            Email: "e2e-dashboard-deficit@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "DashboardDeficit"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: -750m),
    new(
        User: new DevSeedUser(
            Email: "e2e-dashboard-zero@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "DashboardZero"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: 0m),
    new(
        User: new DevSeedUser(
            Email: "e2e-recap-subscriptions@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "RecapSubs"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null,
        Profile: BudgetTimelineProfiles.RecapSubscriptions),
    new(
        User: new DevSeedUser(
            Email: "e2e-recap-savings-debt@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "RecapSavingsDebt"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null,
        Profile: BudgetTimelineProfiles.RecapSavingsDebt),
    new(
        User: new DevSeedUser(
            Email: "e2e-recap-sankey-stress@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "RecapSankeyStress"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null,
        Profile: BudgetTimelineProfiles.RecapSankeyStress),
    new(
        User: new DevSeedUser(
            Email: "e2e-recap-first-closed@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "RecapFirstClosed"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null,
        Profile: BudgetTimelineProfiles.RecapFirstClosed),
    new(
        User: new DevSeedUser(
            Email: "e2e-recap-comparison-skip@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "RecapComparisonSkip"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null,
        Profile: BudgetTimelineProfiles.RecapComparisonSkip),
    new(
        User: new DevSeedUser(
            Email: "e2e-savings-editor@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "SavingsEditor"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null,
        Profile: BudgetTimelineProfiles.SavingsEditor),
    new(
        User: new DevSeedUser(
            Email: "e2e-savings-orphan@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "SavingsOrphan"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null,
        Profile: BudgetTimelineProfiles.SavingsOrphan),
    // Dedicated user for the expense editor E2E spec. Uses the Default
    // timeline so the open 2026-04 month carries a mix of plan-linked
    // rows (Rent / Groceries / Mobile Plan / Netflix), an inactive
    // linked row (Transport Pass), and a month-only subscription
    // (Cloud Storage). Spec is destructive (create / edit / pause /
    // delete) so it must not share an account with the other suites.
    new(
        User: new DevSeedUser(
            Email: "e2e-expenses-editor@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "ExpensesEditor"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null),
    // Dedicated user for the income editor E2E spec. Uses the Default
    // timeline so the open 2026-04 month exposes:
    //   - salary 32 000 kr (plan-linked, locked name, always-active)
    //   - "Freelance" 2 500 kr (plan-linked side hustle)
    //   - "Partner contribution" 1 500 kr (plan-linked household income)
    // The spec is destructive (create / edit scope / toggle active /
    // delete) and pauses then reactivates the household row, so it must
    // not share an account with the expenses or savings suites.
    new(
        User: new DevSeedUser(
            Email: "e2e-income-editor@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "IncomeEditor"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null),
    // Dedicated user for the debt editor E2E spec (Debt PR 10). Uses the
    // Default timeline so the open 2026-04 month exposes two plan-linked
    // active debts:
    //   - "Credit Card" (revolving, balance 15 850 kr, min 650 kr)
    //   - "Student Loan" (installment, balance 93 880 kr, min 1 500 kr, 72 mån)
    // The spec is destructive and future-materialization-sensitive (it
    // creates month-only / plan-linked debts, skips / includes, updates the
    // balance, marks paid off, and archives / restores), so it must not share
    // an account with the expenses, income, or savings suites. Every later
    // lifecycle/participation state is produced through the real UI + backend
    // refetch rather than seeded, matching the PR 10 "no optimistic fiction"
    // contract.
    new(
        User: new DevSeedUser(
            Email: "e2e-debt-editor@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "DebtEditor"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null),
    // Dedicated user for the next-month preview -> plan smoke spec. Uses the
    // Default timeline so the open 2026-04 month exposes a non-empty budget
    // plan (preview projects a real money state rather than the empty-plan
    // setup card) and no 2026-05 month exists yet (so the page lands in the
    // "preview" state). The spec is mutating — it materialises the planned
    // 2026-05 month — so it must not share an account with any other suite.
    new(
        User: new DevSeedUser(
            Email: "e2e-next-month-plan@local.test",
            Password: DevSeedPassword,
            FirstName: "E2E",
            LastName: "NextMonthPlan"),
        IncludeBudget: true,
        OpenMonthTargetFinalBalance: null)
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
root.AddCommand(CreateFixedBudgetSeedCommand(
    name: "seed-users-with-budget",
    description: "Seed the fixed local-dev budget demo users with baseline budget data and deterministic budget timelines.",
    users: budgetSeed));
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

    // Diagnostic: without a logging provider Backend.Tools swallows the
    // application's logged exceptions (UnitOfWorkPipelineBehavior's catch logs
    // the real error then returns a generic "Server.Error" Result). Adding a
    // console sink so seed failures show the actual SQL / domain exception
    // instead of the vague wrapper message.
    services.AddLogging(builder =>
    {
        builder.AddSimpleConsole(options =>
        {
            options.SingleLine = true;
            options.IncludeScopes = false;
        });
        builder.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Information);
    });

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

Command CreateFixedBudgetSeedCommand(string name, string description, IReadOnlyList<LocalBudgetSeedUser> users)
{
    var command = new Command(name, description);

    command.SetHandler(async () =>
    {
        await using var scope = serviceProvider.CreateAsyncScope();

        Console.WriteLine($"Running {name} with {users.Count} fixed local-dev budget account(s).");

        foreach (var seed in users)
        {
            await SeedOneUserAsync(
                scope.ServiceProvider,
                seed.User,
                true,
                DefaultBudgetOpenYearMonth,
                CancellationToken.None,
                profile: seed.Profile);
        }

        Console.WriteLine($"Seeded fixed local-dev budget timelines ending in open month {DefaultBudgetOpenYearMonth}.");
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
                seed.OpenMonthTargetFinalBalance,
                seed.Profile);
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
    decimal? openMonthTargetFinalBalance = null,
    BudgetTimelineProfile? profile = null)
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
    if (profile?.TimelineMonths is { Count: > 0 })
    {
        await monthSeeder.SeedTimelineAsync(
            user.PersoId,
            profile,
            ct);
    }
    else
    {
        await monthSeeder.SeedThreeMonthTimelineAsync(
            user.PersoId,
            openYearMonth,
            ct,
            openMonthTargetFinalBalance,
            profile);
    }

    var profileLabel = profile is null ? "default" : profile.Name;
    var timelineLabel = profile?.TimelineMonths is { Count: > 0 }
        ? "11 closed months + 1 skipped month + open month 2026-04"
        : $"2 closed months + 1 skipped month + open month {openYearMonth}";
    Console.WriteLine($"Seeded budget data for {seedUser.Email} (profile={profileLabel}): {timelineLabel}.");
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

internal sealed record LocalBudgetSeedUser(
    DevSeedUser User,
    BudgetTimelineProfile? Profile);

internal sealed record E2eSeedUser(
    DevSeedUser User,
    bool IncludeBudget,
    decimal? OpenMonthTargetFinalBalance,
    BudgetTimelineProfile? Profile = null);

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
