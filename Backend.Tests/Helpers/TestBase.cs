using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Backend.Services;
using Backend.DataAccess;
using Backend.Helpers;
using System;
using System.IO;

public abstract class TestBase : IDisposable
{
    protected readonly ServiceProvider ServiceProvider;

    protected TestBase()
    {
        var services = new ServiceCollection();

        // Configure services with a test environment setup
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.Test.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables()
            .Build();

        services.AddSingleton<IConfiguration>(configuration);

        // Register test-specific dependencies, e.g., MockEmailService
        services.AddScoped<SqlExecutor>();
        services.AddScoped<UserVerificationHelper>();
        services.AddScoped<UserServices>();
        services.AddSingleton<IEmailService, MockEmailService>();

        // Configure logging for tests
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.SetMinimumLevel(LogLevel.Debug);
        });

        // Build the service provider for use in derived classes
        ServiceProvider = services.BuildServiceProvider();
    }

    public void Dispose()
    {
        ServiceProvider.Dispose();
    }
}
