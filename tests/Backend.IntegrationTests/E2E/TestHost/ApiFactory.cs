using Backend.Application.Abstractions.Application.Services.Security;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.IntegrationTests.E2E.Helpers;
using Backend.IntegrationTests.Shared;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Backend.IntegrationTests.TestHost;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly MariaDbFixture _db;

    public ApiFactory(MariaDbFixture db)
    {
        _db = db;

        // MUST be set BEFORE the host is built, because Program reads this early.
        Environment.SetEnvironmentVariable("WEBSOCKET_SECRET", "dev-ws-secret");

        // If Program relies on env-vars for DB/JWT too, set these as well:
        Environment.SetEnvironmentVariable("DatabaseSettings__ConnectionString", _db.ConnectionString);

        Environment.SetEnvironmentVariable("Turnstile__Enabled", "false");

        Environment.SetEnvironmentVariable("Jwt__ActiveKid", "dev");
        Environment.SetEnvironmentVariable("Jwt__Keys__dev", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
        Environment.SetEnvironmentVariable("JwtSettings__SecretKey", "base64:rJFnYdWsZh+CNhfTFgypWfSXUAIq7USQoORRHPDS2iA=");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTests");

        builder.ConfigureServices(services =>
        {
            // Capture emails
            services.RemoveAll<IEmailCapture>();
            services.AddSingleton<IEmailCapture, InMemoryEmailCapture>();

            // Replace email sender
            services.RemoveAll<IEmailService>();
            services.AddSingleton<IEmailService, InMemoryEmailService>();

            // Make login deterministic
            services.RemoveAll<IHumanChallengePolicy>();
            services.AddSingleton<IHumanChallengePolicy, AlwaysNoChallengePolicy>();

            services.RemoveAll<ITurnstileService>();
            services.AddSingleton<ITurnstileService, AlwaysOkTurnstile>();
        });
    }

    private sealed class AlwaysNoChallengePolicy : IHumanChallengePolicy
    {
        public Task<bool> ShouldRequireAsync(string email, string? remoteIp, string? userAgent, CancellationToken ct)
            => Task.FromResult(false);
    }

    private sealed class AlwaysOkTurnstile : ITurnstileService
    {
        public Task<bool> ValidateAsync(string token, string? remoteIp, CancellationToken ct)
            => Task.FromResult(true);
    }
}