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

        // optional: if you still want concrete injection
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<WebSocketSettings>>().Value);
    })

    .Build();

var emailOpt = new Option<string>("--email") { IsRequired = true };
var passOpt = new Option<string>("--password") { IsRequired = true };
var firstOpt = new Option<string>("--first", () => "Seeded");
var lastOpt = new Option<string>("--last", () => "User");
var suppress = new Option<bool>("--suppress-notify", () => true);

var cmd = new RootCommand("Admin tools: user seeding");
cmd.SetHandler(async (string email, string password, string first, string last, bool sup) =>
{
    await using var scope = host.Services.CreateAsyncScope();
    var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();


    var cmd = new RegisterAndIssueSessionCommand(
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

    var result = await mediator.Send(cmd);
    Console.WriteLine(result.IsSuccess ? "OK" : result.Error.ToString());
}, emailOpt, passOpt, firstOpt, lastOpt, suppress);

cmd.AddOption(emailOpt);
cmd.AddOption(passOpt);
cmd.AddOption(firstOpt);
cmd.AddOption(lastOpt);
cmd.AddOption(suppress);

return await cmd.InvokeAsync(args);
