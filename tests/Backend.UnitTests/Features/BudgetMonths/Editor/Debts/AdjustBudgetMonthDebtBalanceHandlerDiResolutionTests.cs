using Backend.Application;
using Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;
using Backend.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Debts;

// PR 3 review-fix coverage. The original PR 3 integration tests instantiate
// the handler manually with `TimeProvider.System`, which hides a real
// production bug: `Backend/Infrastructure/DependencyInjection.cs` only
// registered the project's `ITimeProvider` abstraction, while the handler's
// constructor declares the BCL `TimeProvider`. A pipeline-driven invocation
// (via MediatR / HTTP) would have failed at DI resolution.
//
// This test exercises the production registration extensions end-to-end and
// builds the handler the way the runtime would. It catches the class of
// gap the reviewer flagged for every sibling handler that follows the same
// "BCL TimeProvider via constructor injection" pattern.
public sealed class AdjustBudgetMonthDebtBalanceHandlerDiResolutionTests
{
    [Fact]
    public async Task TimeProvider_IsRegistered_BySharedExtension()
    {
        await using var sp = BuildProvider();

        // The fix under review: BCL `TimeProvider` must be resolvable. The
        // project's separate `ITimeProvider` is also registered, but the
        // sibling debt handlers (PR 1 / PR 2 / Bulk) and ~20 handlers
        // elsewhere all take the BCL type by constructor, so this is the
        // registration that actually matters for them.
        sp.GetRequiredService<TimeProvider>().Should().NotBeNull();
    }

    [Fact]
    public async Task AdjustHandler_ConstructorDependencies_AllResolveFromProductionDi()
    {
        await using var sp = BuildProvider();

        // ActivatorUtilities goes through the same constructor-injection
        // path the runtime uses, but skips MediatR's pipeline behaviors
        // so the assertion stays focused on the handler's own dependency
        // graph. If any constructor parameter is missing a registration,
        // this throws `InvalidOperationException` with the offending type.
        var handler = ActivatorUtilities.CreateInstance<AdjustBudgetMonthDebtBalanceCommandHandler>(sp);

        handler.Should().NotBeNull();
    }

    private static ServiceProvider BuildProvider()
    {
        // The infrastructure registrations read a handful of `IConfiguration`
        // sections (`DatabaseSettings`, `JwtSettings`, …). Empty sections
        // satisfy `Configure<T>` bindings without firing validation, which
        // only runs on `ValidateOnStart` for option types the test resolves.
        // A throwaway connection string keeps the connection factory
        // construction lazy — nothing opens a real connection here.
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DatabaseSettings:ConnectionString"] = "Server=localhost;Database=di-smoke;"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging(b => b.AddDebug());
        services.AddSingleton<IHostEnvironment>(new TestHostEnvironment());
        services.AddApplicationServices(configuration);
        services.AddInfrastructureServices(configuration, isProduction: false);

        return services.BuildServiceProvider(new ServiceProviderOptions
        {
            // Don't validate scopes — the production graph mixes scoped and
            // singleton lifetimes intentionally (e.g., singletons reading
            // scoped repos via factory delegates). The DI failure this test
            // exists to catch is a *missing* registration, not a scope mix.
            ValidateScopes = false
        });
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Test";
        public string ApplicationName { get; set; } = "Backend.UnitTests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; }
            = new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
