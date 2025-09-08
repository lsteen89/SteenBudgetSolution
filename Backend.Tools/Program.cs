using System.CommandLine;
using MediatR;
using Backend.Application;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Domain.Shared;
using Backend.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Backend.Application.Features.Commands.Auth.Register;
using Backend.Application.Abstractions.Infrastructure.Data;
using MySqlConnector;

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

        // CLI: bypass CAPTCHA
        services.RemoveAll<IRecaptchaService>();
        services.AddSingleton<IRecaptchaService, NoopRecaptchaValidator>();

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

    var register = new RegisterUserCommand(
        FirstName: first,
        LastName: last,
        Email: email,
        Password: password,
        CaptchaToken: "",   // ignored by NoopRecaptchaValidator
        Honeypot: null
    )
    {
        IsSeedingOperation = true
    };

    Result r = await mediator.Send(register);
    Console.WriteLine(r.IsSuccess ? "OK" : r.Error.ToString());
}, emailOpt, passOpt, firstOpt, lastOpt, suppress);

cmd.AddOption(emailOpt);
cmd.AddOption(passOpt);
cmd.AddOption(firstOpt);
cmd.AddOption(lastOpt);
cmd.AddOption(suppress);

return await cmd.InvokeAsync(args);

// --- CLI-only no-op CAPTCHA service ---
public sealed class NoopRecaptchaValidator : IRecaptchaService
{
    public Task<bool> ValidateTokenAsync(string token) => Task.FromResult(true);
}
