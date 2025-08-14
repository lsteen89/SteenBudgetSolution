using System;
using Backend.Infrastructure.Data;                        // SqlBase
using Backend.Infrastructure.Data.Sql.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Settings;                                  // DatabaseSettings
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace Backend.Tests.Fixtures
{
    public class DatabaseFixture : IDisposable
    {
        public string ConnectionString { get; }
        public ServiceProvider ServiceProvider { get; }

        public DatabaseFixture()
        {
            // 1) Build config from JSON + ENV
            var configuration = new ConfigurationBuilder()
                .SetBasePath(AppContext.BaseDirectory)
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
                .AddEnvironmentVariables()
                .Build();

            // 2) Bind DatabaseSettings
            var dbSettings = configuration
                .GetSection("DatabaseSettings")
                .Get<DatabaseSettings>()
                ?? throw new InvalidOperationException("Missing DatabaseSettings section.");

            if (string.IsNullOrWhiteSpace(dbSettings.ConnectionString))
            {
                throw new InvalidOperationException(
                    "Test database connection string not configured. " +
                    "Please set env-var DatabaseSettings__ConnectionString or add it to appsettings.json.");
            }
            ConnectionString = dbSettings.ConnectionString;

            // 3) Build the test DI container
            var services = new ServiceCollection();

            // a) Make config & POCO available
            services.AddSingleton<IConfiguration>(configuration);
            services.Configure<DatabaseSettings>(configuration.GetSection("DatabaseSettings"));

            // b) Logging
            services.AddLogging(lb => lb
                .AddConsole()
                .SetMinimumLevel(LogLevel.Debug));

            // c) Your real MySql connection factory
            services.AddSingleton<IConnectionFactory>(
                _ => new MySqlConnectionFactory(ConnectionString));

            // d) Register SqlBase → a tiny concrete subclass
            services.AddScoped<SqlBase, TestSqlBase>();

            // … you can register any other “infrastructure” pieces here,
            //     but IntegrationTestBase will build its own ServiceProvider
            //     for application services later.

            ServiceProvider = services.BuildServiceProvider();

            // 4) (Optional) smoke-test / run migrations / seed
            EnsureDatabaseSetup();
        }

        private void EnsureDatabaseSetup()
        {
            using var conn = new MySqlConnection(ConnectionString);
            conn.Open();
            // run migrations or seed data here
        }

        public void Dispose()
        {
            (ServiceProvider as IDisposable)?.Dispose();
        }


        // ------------------------------------------------------
        // A concrete subclass so DI can instantiate SqlBase:
        // ------------------------------------------------------
        private class TestSqlBase : SqlBase
        {
            public TestSqlBase(
                IConnectionFactory factory,
                ILogger<TestSqlBase> logger
            ) : base(factory, logger)
            { }
        }
    }
}
