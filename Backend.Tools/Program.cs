using System.CommandLine;
using MediatR;
using Backend.Application;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Backend.Application.Features.Authentication.Register.RegisterAndIssueSession;
using Backend.Application.Abstractions.Infrastructure.Data;
using MySqlConnector;
using Backend.Settings;
using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.Auth;
using Backend.Infrastructure.Auth;

var host = Host.CreateDefaultBuilder(args)
    // console tool: don't validate the whole web graph
    .UseDefaultServiceProvider((ctx, o) =>
    {
        o.ValidateOnBuild = false;
        o.ValidateScopes = false;
    })
    .ConfigureServices((ctx, services) =>
    {
        services
            .AddApplicationServices(ctx.Configuration)
            .AddInfrastructureServices(ctx.Configuration, isProduction: false);

        services.Configure<JwtSettings>(ctx.Configuration.GetSection("Jwt"));
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<JwtSettings>>().Value);

        // If anything in infra expects WebSocketSettings as concrete (some codebases do)
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<WebSocketSettings>>().Value);
        services.AddSingleton<IJwtKeyRing, HsKeyRing>();

        // CLI: override the DB connection with a user-provided connection string
        services.RemoveAll<IUnitOfWork>();      // <— override the UoW the repos actually use
        services.AddScoped<IUnitOfWork>(sp =>
        {
            var cfg = ctx.Configuration;
            var cs =
                cfg["DatabaseSettings:ConnectionString"] ??
                cfg["DATABASESETTINGS__CONNECTIONSTRING"] ??
                cfg["ConnectionStrings:Default"];

            if (string.IsNullOrWhiteSpace(cs))
                throw new InvalidOperationException(
                    "DB connection string missing for Backend.Tools. Provide user-secret DatabaseSettings:ConnectionString or env DATABASESETTINGS__CONNECTIONSTRING.");

            return new CliUnitOfWork(new MySqlConnection(cs));
        });
        services.Configure<WebSocketSettings>(o =>
    {
        o.Secret = ctx.Configuration["WEBSOCKET_SECRET"]
            ?? throw new InvalidOperationException("WEBSOCKET_SECRET missing");
    });

        services.AddScoped<BudgetTimelineSeeder>();

        // optional: if you still want concrete injection
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<WebSocketSettings>>().Value);
    })

    .Build();

var root = new RootCommand("Admin tools: user seeding");
root.AddCommand(CreateSeedCommand(
    name: "seed-user",
    description: "Seed a user only.",
    includeBudget: false));
root.AddCommand(CreateSeedCommand(
    name: "seed-user-budget",
    description: "Seed a user together with baseline budget data and a 3-month demo timeline.",
    includeBudget: true));

return await root.InvokeAsync(args);

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

        await using var scope = host.Services.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();

        var registerCmd = new RegisterAndIssueSessionCommand(
            FirstName: first,
            LastName: last,
            Email: email,
            Password: password,
            HumanToken: "",     // ignored in trusted seed
            Honeypot: "",       // ignored in trusted seed
            Locale: "sv-SE",
            RemoteIp: null,
            DeviceId: "seed-cli",
            UserAgent: "backend.tools"
        )
        { IsSeedingOperation = true };

        var result = await mediator.Send(registerCmd);
        if (result.IsSuccess)
        {
            Console.WriteLine("OK");
        }
        else
        {
            Console.WriteLine(result.Error.ToString());
            if (!includeBudget)
                return;
        }

        if (!includeBudget)
            return;

        var user = await users.GetUserModelAsync(email: email, ct: CancellationToken.None);
        if (user is null)
            throw new InvalidOperationException($"Could not resolve user by email: {email}");

        if (!result.IsSuccess)
            Console.WriteLine("Continuing with budget seeding using existing user account...");

        await RunInTransactionAsync(
            uow,
            async () =>
            {
                if (!await users.SetFirstTimeLoginAsync(user.PersoId, CancellationToken.None))
                    throw new InvalidOperationException($"Could not set FirstLogin = 0 for user: {email}");
            },
            CancellationToken.None);

        var monthSeeder = scope.ServiceProvider.GetRequiredService<BudgetTimelineSeeder>();
        await monthSeeder.SeedThreeMonthTimelineAsync(user.PersoId, CancellationToken.None);

        Console.WriteLine("Seeded full budget: baseline + timeline (2 closed months + 1 open month).");
        Console.WriteLine("Set Users.FirstLogin = 0 so the dashboard skips the setup wizard.");
    }, emailOpt, passOpt, firstOpt, lastOpt, suppress);

    return command;
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
