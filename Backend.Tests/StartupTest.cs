using System.IO;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MySqlConnector;
using System.Data.Common;
using System;
using Microsoft.Extensions.Options;
using System.Threading.Tasks;
using Backend.Helpers.TestClasses.UserTests.Backend.Helpers.TestClasses.UserTests;
using Backend.Tests.Mocks;
using Backend.Infrastructure.Data;
using Backend.Infrastructure.Email;
using Backend.Application.Services.UserServices;
using Backend.Infrastructure.Helpers;
using Backend.Application.Settings;
using Backend.Domain.Interfaces;
using Backend.Infrastructure.Data.Sql.UserQueries;

public class StartupTest
{
    public void ConfigureServices(IServiceCollection services)
    {
        // Set up configuration to load from appsettings.json or environment variables
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables()
            .Build();

        services.AddSingleton<IConfiguration>(configuration);

        // Register DbConnection with a test database connection string
        services.AddScoped<DbConnection>(provider =>
        {
            var connectionString = configuration.GetConnectionString("TestDatabase")
                                   ?? Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");

            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Database connection string not found in environment variables or configuration.");
            }

            return new MySqlConnection(connectionString);
        });

        // Register other dependencies
        services.AddScoped<UserSqlExecutor>();
        services.AddScoped<UserServices>();
        //services.AddSingleton<IEmailService, MockEmailService>();
        services.AddSingleton<IEmailPreparationService, EmailPreparationService>();

        services.AddScoped<UserServiceTest>();
        services.AddScoped<UserVerificationHelper>(provider =>
        {
            var UserSqlExecutor = provider.GetRequiredService<UserSqlExecutor>();
            var emailService = provider.GetRequiredService<IEmailService>();
            var options = provider.GetRequiredService<IOptions<ResendEmailSettings>>();
            var logger = provider.GetRequiredService<ILogger<UserVerificationHelper>>();

            // Define delegates for email sending and current time retrieval
            Func<string, Task<bool>> sendVerificationEmail = email =>
                provider.GetRequiredService<UserServices>().SendVerificationEmailWithTokenAsync(email);

            Func<DateTime> getCurrentTime = () => DateTime.UtcNow;

            // Pass delegates into UserVerificationHelper constructor
            return new UserVerificationHelper(UserSqlExecutor, emailService, options, logger, sendVerificationEmail, getCurrentTime);
        });

        // Add logging
        services.AddLogging(builder =>
        {
            builder.AddConsole(); // Console logging for test output
            builder.SetMinimumLevel(LogLevel.Information);
        });
    }
}
